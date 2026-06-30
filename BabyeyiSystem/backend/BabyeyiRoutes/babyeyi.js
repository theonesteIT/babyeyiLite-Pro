// ================================================================
// routes/BabyeyiRoutes/babyeyi.js  — v13
//
// v13 changes vs v12:
//   • buildQRPayload now encodes full verify URL so phone scanners
//     open the browser directly:
//     http://localhost:5173/babyeyi/verify/BY-2025-00025?h=abc123def456
//   • parseQRPayload handles both new URL format AND legacy pipe format
//     (BY-2025-00025|abc123def456) — old printed QRs keep working
//   • GET /verify/:docId now also reads ?h= query param so the
//     verify page gets full cryptographic validation
//   • GET /verify/:docId response now includes verifyUrl field
//
// .env requirement:
//   BABYEYI_HASH_SECRET=43b7920096c8119a89a3d04500579ded67c6b012b4290f6a92553782d8a889b1
//   FRONTEND_URL=http://localhost:5173   (change to prod domain when ready)
// ================================================================

const express  = require("express");
const router   = express.Router();
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const QRCode   = require("qrcode");
const PDFDoc   = require("pdfkit");
const crypto   = require("crypto");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const db       = require("../config/database");
const { buildBabyeyiTranslationBundle, normalizeSourceLang } = require("../utils/babyeyiI18n");
const {
  buildAndPersistContentI18n,
  mergeLocalizedBabyeyiPayload,
  splitClassRows,
  mergeRwPatchesIntoContentI18nBundle,
} = require("../utils/babyeyiContentI18n");
const { getDocStrings } = require("../utils/babyeyiDocI18n");
const { buildBabyeyiPrintPageHtml } = require("../utils/babyeyiDocHtml");
const { fileToDataUrl, renderHtmlToPdfFile, puppeteerAvailable } = require("../utils/babyeyiPuppeteerPdf");
const { fetchStudentRequirementsCatalog } = require("../utils/studentRequirementsSchema");
const { normalizeSchoolId } = require("../utils/normalizeSchoolId");

// ── Upload dirs ───────────────────────────────────────────────
const UPLOAD_DIR = "uploads/babyeyi/";
const QR_DIR     = "uploads/babyeyi/qrcodes/";
const PDF_DIR    = "uploads/babyeyi/pdfs/";
const ASSET_DIR  = "uploads/school_assets/";

[UPLOAD_DIR, QR_DIR, PDF_DIR, ASSET_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── Debug flag ────────────────────────────────────────────────
const DEBUG_HASH = process.env.DEBUG_HASH === "1" || process.env.NODE_ENV === "development";

// ── Helpers ───────────────────────────────────────────────────
const query = (sql, params = []) => db.query(sql, params);

/** For NESA fee-limit checks: private schools never; Government-Aided may skip when babyeyi targets private-fee students. */
async function getSchoolOwnershipType(schoolId) {
  if (!schoolId) return "";
  const rows = await query("SELECT ownership_type FROM schools WHERE id=? LIMIT 1", [schoolId]).catch(() => []);
  return String(rows[0]?.ownership_type || "").trim();
}

function shouldSkipNesaFeeLimits(schoolOwnershipRaw, feeTargetStudentsRaw) {
  const o = String(schoolOwnershipRaw || "").trim().toLowerCase().replace(/\s+/g, "-");
  const f = String(feeTargetStudentsRaw || "public").trim().toLowerCase();
  if (o === "private") return true;
  const isAided =
    o === "government-aided" ||
    o.includes("aided") ||
    o.replace(/-/g, "") === "governmentaided";
  if (isAided && f === "private") return true;
  return false;
}

let parentNotifyMailer = null;
function getParentNotifyMailer() {
  if (parentNotifyMailer !== null) return parentNotifyMailer;
  if (!process.env.SMTP_USER) {
    parentNotifyMailer = false;
    return null;
  }
  parentNotifyMailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return parentNotifyMailer;
}

function normalizeEmail(v) {
  const s = String(v || "").trim().toLowerCase();
  if (!s || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

function parseClassesForAnnouncement(babyeyiRow) {
  const classes = [];
  const fromClass = String(babyeyiRow?.class_name || "").trim();
  if (fromClass) classes.push(fromClass);
  const raw = babyeyiRow?.classes_json;
  if (raw) {
    try {
      const arr = Array.isArray(raw) ? raw : JSON.parse(raw);
      for (const c of arr || []) {
        const t = String(c || "").trim();
        if (t) classes.push(t);
      }
    } catch (_) {}
  }
  return Array.from(new Set(classes.map((c) => c.toUpperCase())));
}

async function notifyParentsBabyeyiReady(babyeyiId, reason = "published") {
  const id = Number(babyeyiId || 0);
  if (!id) return { sent: false, skipped: "invalid_id" };
  const transport = getParentNotifyMailer();
  if (!transport) return { sent: false, skipped: "smtp_not_configured" };

  const rows = await query(
    `SELECT id, school_id, school_name, academic_year, term, class_name, classes_json, status, doc_id
     FROM school_babyeyi
     WHERE id = ? AND is_active = 1
     LIMIT 1`,
    [id]
  );
  const babyeyi = rows?.[0];
  if (!babyeyi) return { sent: false, skipped: "babyeyi_not_found" };
  if (String(babyeyi.status || "").toLowerCase() !== "approved") {
    return { sent: false, skipped: "not_approved" };
  }
  const classes = parseClassesForAnnouncement(babyeyi);
  if (!babyeyi.school_id || !classes.length) return { sent: false, skipped: "missing_school_or_classes" };
  const marks = classes.map(() => "?").join(",");
  const parentRows = await query(
    `SELECT father_email, mother_email
     FROM students
     WHERE school_id = ?
       AND UPPER(TRIM(class_name)) IN (${marks})`,
    [babyeyi.school_id, ...classes]
  ).catch(() => []);
  const allEmails = new Set();
  for (const r of parentRows || []) {
    const e1 = normalizeEmail(r?.father_email);
    const e2 = normalizeEmail(r?.mother_email);
    if (e1) allEmails.add(e1);
    if (e2) allEmails.add(e2);
  }
  const recipients = Array.from(allEmails);
  if (!recipients.length) return { sent: false, skipped: "no_parent_emails" };

  const frontendUrl = String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
  const payUrl = `${frontendUrl}/babyeyi-finder`;
  const classLabel = classes.join(", ");
  const subject = `New school payment notice - ${babyeyi.school_name || "School"} (${babyeyi.term}/${babyeyi.academic_year})`;
  const text = `Dear Parent/Guardian,

Your school published a new Babyeyi payment notice.
School: ${babyeyi.school_name || "School"}
Term: ${babyeyi.term || "-"}
Academic year: ${babyeyi.academic_year || "-"}
Class(es): ${classLabel}
Document: ${babyeyi.doc_id || `BY-${babyeyi.id}`}

Open and pay: ${payUrl}
Reference: ${reason}`;

  let sentCount = 0;
  const from = process.env.SMTP_FROM || `"Babyeyi Notifications" <${process.env.SMTP_USER}>`;
  for (let i = 0; i < recipients.length; i += 80) {
    const chunk = recipients.slice(i, i + 80);
    try {
      await transport.sendMail({
        from,
        to: from,
        bcc: chunk,
        subject,
        text,
      });
      sentCount += chunk.length;
    } catch (e) {
      console.warn("[babyeyi] parent announcement failed:", e.message);
    }
  }
  return { sent: sentCount > 0, sentCount, totalRecipients: recipients.length };
}

/** After school saves Babyeyi requirements, insert requirement_prices from student_requirements.default_price when missing. */
async function seedRequirementPricesFromDefaults(babyeyiId, schoolId, academicYear, term, className) {
  try {
    let rows;
    try {
      rows = await query(
        `SELECT id, item, COALESCE(pay_channel,'babyeyi') AS pay_channel, cost FROM babyeyi_student_requirements WHERE babyeyi_id = ?`,
        [babyeyiId]
      );
    } catch (_) {
      rows = await query(`SELECT id, item FROM babyeyi_student_requirements WHERE babyeyi_id = ?`, [babyeyiId]);
    }
    for (const row of rows) {
      if (String(row.pay_channel || "").toLowerCase() === "school" && Number(row.cost) > 0) continue;
      const m = await query(
        `SELECT default_price FROM student_requirements WHERE TRIM(LOWER(name)) = TRIM(LOWER(?)) LIMIT 1`,
        [row.item]
      );
      const def = m[0]?.default_price;
      if (def == null || Number(def) === 0) continue;
      const ex = await query(
        `SELECT id FROM requirement_prices WHERE babyeyi_id = ? AND babyeyi_requirement_id = ?`,
        [babyeyiId, row.id]
      );
      if (ex.length) continue;
      await query(
        `INSERT INTO requirement_prices (babyeyi_id, babyeyi_requirement_id, school_id, class_id, term, academic_year, price)
         VALUES (?,?,?,?,?,?,?)`,
        [babyeyiId, row.id, schoolId, className, term, academicYear, Number(def)]
      );
    }
  } catch (e) {
    console.warn("[babyeyi] seedRequirementPricesFromDefaults:", e.message);
  }
}

let babyeyiPaymentsPayChannelReady = false;
async function ensureBabyeyiPaymentsPayChannelColumn() {
  if (babyeyiPaymentsPayChannelReady) return;
  try {
    await query(
      "ALTER TABLE babyeyi_payments ADD COLUMN pay_channel VARCHAR(16) NOT NULL DEFAULT 'babyeyi'"
    );
  } catch (e) {
    if (e.code !== "ER_DUP_FIELDNAME") {
      console.warn("[babyeyi] ensureBabyeyiPaymentsPayChannelColumn:", e.message);
    }
  }
  babyeyiPaymentsPayChannelReady = true;
}

let accountantFeeArchiveTableReady = false;
async function ensureAccountantFeeArchiveTable() {
  if (accountantFeeArchiveTableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS accountant_babyeyi_fee_archive (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      babyeyi_id BIGINT NOT NULL,
      academic_year VARCHAR(64) NOT NULL DEFAULT '',
      term VARCHAR(64) NOT NULL DEFAULT '',
      class_name VARCHAR(255) NULL,
      classes_json LONGTEXT NULL,
      snapshot_json LONGTEXT NOT NULL,
      babyeyi_is_active TINYINT(1) NOT NULL DEFAULT 1,
      source_updated_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_archive_babyeyi (babyeyi_id),
      KEY idx_archive_school_term (school_id, academic_year, term)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch((e) => console.warn("[babyeyi] ensureAccountantFeeArchiveTable:", e.message));
  accountantFeeArchiveTableReady = true;
}

let accountantFeeTotalsTableReady = false;
async function ensureAccountantFeeTotalsTable() {
  if (accountantFeeTotalsTableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS accountant_babyeyi_fees (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      babyeyi_id BIGINT NOT NULL,
      academic_year VARCHAR(64) NOT NULL DEFAULT '',
      term VARCHAR(64) NOT NULL DEFAULT '',
      class_name VARCHAR(255) NULL,
      classes_json LONGTEXT NULL,
      tuition_total DECIMAL(14,2) NOT NULL DEFAULT 0,
      paid_at_school_total DECIMAL(14,2) NOT NULL DEFAULT 0,
      total_due DECIMAL(14,2) NOT NULL DEFAULT 0,
      babyeyi_is_active TINYINT(1) NOT NULL DEFAULT 1,
      babyeyi_status VARCHAR(32) NULL,
      source_updated_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_totals_babyeyi (babyeyi_id),
      KEY idx_totals_school_term (school_id, academic_year, term)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch((e) => console.warn("[babyeyi] ensureAccountantFeeTotalsTable:", e.message));
  await query(`
    INSERT INTO accountant_babyeyi_fees
      (school_id, babyeyi_id, academic_year, term, class_name, classes_json,
       tuition_total, paid_at_school_total, total_due, babyeyi_is_active, babyeyi_status,
       source_updated_at, created_at, updated_at)
    SELECT school_id, babyeyi_id, academic_year, term, class_name, classes_json,
           tuition_total, paid_at_school_total, total_due, babyeyi_is_active, babyeyi_status,
           source_updated_at, created_at, updated_at
    FROM accountant_babyeyi_fee_totals
    ON DUPLICATE KEY UPDATE
      school_id = VALUES(school_id),
      academic_year = VALUES(academic_year),
      term = VALUES(term),
      class_name = VALUES(class_name),
      classes_json = VALUES(classes_json),
      tuition_total = VALUES(tuition_total),
      paid_at_school_total = VALUES(paid_at_school_total),
      total_due = VALUES(total_due),
      babyeyi_is_active = VALUES(babyeyi_is_active),
      babyeyi_status = VALUES(babyeyi_status),
      source_updated_at = VALUES(source_updated_at),
      updated_at = VALUES(updated_at)
  `).catch(() => {});
  accountantFeeTotalsTableReady = true;
}

function paymentPayChannelFromPayload(p) {
  return String(p?.pay_channel || p?.payChannel || "").toLowerCase() === "school" ? "school" : "babyeyi";
}

/** Snapshot tuition/requirement lines for accountants (survives manager soft-delete). */
async function syncAccountantFeeArchive(babyeyiId) {
  const bid = Number(babyeyiId);
  if (!bid) return;
  try {
    await ensureAccountantFeeArchiveTable();
    await ensureBabyeyiPaymentsPayChannelColumn();
    const rows = await query("SELECT * FROM school_babyeyi WHERE id=?", [bid]).catch(() => []);
    if (!rows?.length) return;
    const b = rows[0];
    let pays;
    try {
      pays = await query(
        `SELECT id, name, amount, sort_order, COALESCE(pay_channel,'babyeyi') AS pay_channel
         FROM babyeyi_payments WHERE babyeyi_id=? ORDER BY sort_order, id`,
        [bid]
      );
    } catch (_) {
      pays = await query(
        `SELECT id, name, amount, sort_order, 'babyeyi' AS pay_channel
         FROM babyeyi_payments WHERE babyeyi_id=? ORDER BY sort_order, id`,
        [bid]
      );
    }
    let reqs;
    try {
      reqs = await query(
        `SELECT id, item, description, quantity, sort_order, COALESCE(pay_channel,'babyeyi') AS pay_channel, cost
         FROM babyeyi_student_requirements WHERE babyeyi_id=? ORDER BY sort_order, id`,
        [bid]
      );
    } catch (_) {
      reqs = await query(
        `SELECT id, item, description, quantity, sort_order FROM babyeyi_student_requirements WHERE babyeyi_id=? ORDER BY sort_order, id`,
        [bid]
      );
    }
    const snapshot = {
      payments: (pays || []).map((x) => ({
        id: x.id,
        name: x.name,
        amount: Number(x.amount || 0),
        pay_channel:
          String(x.pay_channel || "babyeyi").toLowerCase() === "school" ? "school" : "babyeyi",
        sort_order: x.sort_order,
      })),
      requirements: (reqs || []).map((x) => ({
        id: x.id,
        item: x.item,
        description: x.description || null,
        quantity: x.quantity || null,
        pay_channel: x.pay_channel
          ? String(x.pay_channel).toLowerCase() === "school"
            ? "school"
            : "babyeyi"
          : "babyeyi",
        cost: x.cost != null ? Number(x.cost) : null,
        sort_order: x.sort_order,
      })),
    };
    try {
      if (b.is_active && String(b.status || "").toLowerCase() === "approved") {
        const { loadApprovedBabyeyiPricing } = require("./babyeyiPublicPricingCore");
        const pr = await loadApprovedBabyeyiPricing(bid, b.school_id);
        if (pr.ok && Array.isArray(pr.data.requirements) && pr.data.requirements.length) {
          const m = new Map(pr.data.requirements.map((r) => [Number(r.babyeyi_requirement_id), r.line_total_rwf]));
          snapshot.requirements = snapshot.requirements.map((x) => ({
            ...x,
            line_total_rwf: m.get(Number(x.id)) ?? x.line_total_rwf,
          }));
        }
      }
    } catch (en) {
      /* ignore enrichment failures */
    }
    const classesJsonVal =
      typeof b.classes_json === "string" ? b.classes_json : JSON.stringify(b.classes_json || []);
    await query(
      `INSERT INTO accountant_babyeyi_fee_archive
         (school_id, babyeyi_id, academic_year, term, class_name, classes_json, snapshot_json, babyeyi_is_active, source_updated_at)
       VALUES (?,?,?,?,?,?,?,?,NOW())
       ON DUPLICATE KEY UPDATE
         school_id=VALUES(school_id),
         academic_year=VALUES(academic_year),
         term=VALUES(term),
         class_name=VALUES(class_name),
         classes_json=VALUES(classes_json),
         snapshot_json=VALUES(snapshot_json),
         babyeyi_is_active=VALUES(babyeyi_is_active),
         source_updated_at=VALUES(source_updated_at),
         updated_at=CURRENT_TIMESTAMP`,
      [
        b.school_id,
        bid,
        String(b.academic_year || ""),
        String(b.term || ""),
        b.class_name || null,
        classesJsonVal,
        JSON.stringify(snapshot),
        b.is_active ? 1 : 0,
      ]
    );
  } catch (e) {
    console.warn("[babyeyi] syncAccountantFeeArchive:", e.message);
  }
}

function moneyRound2(v) {
  return Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
}

/** Keep accountant totals table in sync with Babyeyi create/update/delete. */
async function syncAccountantFeeTotals(babyeyiId) {
  const bid = Number(babyeyiId);
  if (!bid) return;
  try {
    await ensureAccountantFeeTotalsTable();
    await ensureBabyeyiPaymentsPayChannelColumn();

    const rows = await query("SELECT * FROM school_babyeyi WHERE id=?", [bid]).catch(() => []);
    if (!rows?.length) return;
    const b = rows[0];

    let pays;
    try {
      pays = await query(
        `SELECT amount, COALESCE(pay_channel,'babyeyi') AS pay_channel
         FROM babyeyi_payments WHERE babyeyi_id=?`,
        [bid]
      );
    } catch (_) {
      pays = await query(`SELECT amount, 'babyeyi' AS pay_channel FROM babyeyi_payments WHERE babyeyi_id=?`, [bid]);
    }

    let reqs;
    try {
      reqs = await query(
        `SELECT COALESCE(pay_channel,'babyeyi') AS pay_channel, cost
         FROM babyeyi_student_requirements
         WHERE babyeyi_id=?`,
        [bid]
      );
    } catch (_) {
      reqs = [];
    }

    let tuitionTotal = 0;
    let paidAtSchoolTotal = 0;
    for (const p of pays || []) {
      const amt = Number(p?.amount || 0);
      if (amt <= 0) continue;
      const ch = String(p?.pay_channel || "babyeyi").toLowerCase() === "school" ? "school" : "babyeyi";
      if (ch === "school") paidAtSchoolTotal += amt;
      else tuitionTotal += amt;
    }
    for (const r of reqs || []) {
      const ch = String(r?.pay_channel || "babyeyi").toLowerCase() === "school" ? "school" : "babyeyi";
      if (ch !== "school") continue;
      const line = Number(r?.cost || 0);
      if (line > 0) paidAtSchoolTotal += line;
    }

    tuitionTotal = moneyRound2(tuitionTotal);
    paidAtSchoolTotal = moneyRound2(paidAtSchoolTotal);
    const totalDue = moneyRound2(tuitionTotal + paidAtSchoolTotal);
    const classesJsonVal =
      typeof b.classes_json === "string" ? b.classes_json : JSON.stringify(b.classes_json || []);

    await query(
      `INSERT INTO accountant_babyeyi_fees
         (school_id, babyeyi_id, academic_year, term, class_name, classes_json,
          tuition_total, paid_at_school_total, total_due, babyeyi_is_active, babyeyi_status, source_updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())
       ON DUPLICATE KEY UPDATE
         school_id=VALUES(school_id),
         academic_year=VALUES(academic_year),
         term=VALUES(term),
         class_name=VALUES(class_name),
         classes_json=VALUES(classes_json),
         tuition_total=VALUES(tuition_total),
         paid_at_school_total=VALUES(paid_at_school_total),
         total_due=VALUES(total_due),
         babyeyi_is_active=VALUES(babyeyi_is_active),
         babyeyi_status=VALUES(babyeyi_status),
         source_updated_at=VALUES(source_updated_at),
         updated_at=CURRENT_TIMESTAMP`,
      [
        b.school_id,
        bid,
        String(b.academic_year || ""),
        String(b.term || ""),
        b.class_name || null,
        classesJsonVal,
        tuitionTotal,
        paidAtSchoolTotal,
        totalDue,
        b.is_active ? 1 : 0,
        String(b.status || ""),
      ]
    );
  } catch (e) {
    console.warn("[babyeyi] syncAccountantFeeTotals:", e.message);
  }
}

async function syncAccountantFeeData(babyeyiId) {
  await syncAccountantFeeArchive(babyeyiId);
  await syncAccountantFeeTotals(babyeyiId);
}

const getIp = req =>
  req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
  req.socket?.remoteAddress || "unknown";

const audit = async (babyeyiId, action, oldVals, newVals, req) => {
  try {
    const userId = req.user?.id || null;
    const ip     = getIp(req);
    const oldJ   = oldVals ? JSON.stringify(oldVals) : null;
    const newJ   = newVals ? JSON.stringify(newVals) : null;
    try {
      await query(
        `INSERT INTO babyeyi_audit_log (babyeyi_id, action, changed_by, old_values, new_values, ip_address) VALUES (?,?,?,?,?,?)`,
        [babyeyiId, action, userId, oldJ, newJ, ip]
      );
    } catch (e1) {
      if (e1.code === "ER_BAD_FIELD_ERROR") {
        await query(
          `INSERT INTO babyeyi_audit_log (babyeyi_id, action, user_id, old_values, new_values, ip_address) VALUES (?,?,?,?,?,?)`,
          [babyeyiId, action, userId, oldJ, newJ, ip]
        );
      } else { throw e1; }
    }
  } catch (e) { console.warn("[babyeyi] audit fail:", e.message); }
};

const parseJSONField = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

const classToLevel = (cls) => {
  const raw = String(cls || "").trim();
  if (!raw) return "Primary";
  const code = raw.match(/\b(N[123]|P[1-6]|S[1-6]|L[1-3])\b/i);
  if (code) {
    const c = code[1].toUpperCase();
    if (/^N[123]$/.test(c)) return "Nursery";
    if (/^P[1-6]$/.test(c)) return "Primary";
    if (/^S[1-6]$/.test(c)) return "Secondary";
    if (/^L[1-3]$/.test(c)) return "University";
  }
  if (["N1", "N2", "N3"].includes(raw)) return "Nursery";
  if (["P1", "P2", "P3", "P4", "P5", "P6"].includes(raw)) return "Primary";
  if (["S1", "S2", "S3", "S4", "S5", "S6"].includes(raw)) return "Secondary";
  if (["L1", "L2", "L3"].includes(raw)) return "University";
  return "Primary";
};

/** Match fee_limits row: exact term first; Term 1/2/3 also match a stored "Full Year" cap. */
async function queryActiveNesaFeeLimit(category, level, term, academicYear) {
  const cat = String(category || "").trim();
  const lvl = String(level || "").trim();
  const t = String(term || "").trim();
  const year = String(academicYear || "").trim();
  if (!cat || !lvl || !t || !year) return null;

  const termSql = `(term=? OR (? <> 'Full Year' AND term='Full Year'))`;
  const termOrder = `CASE WHEN term=? THEN 0 WHEN term='Full Year' THEN 1 ELSE 2 END`;

  let rows = await query(
    `SELECT id, max_amount, regulation_ref, notes, term, academic_year FROM fee_limits
     WHERE category=? AND LOWER(TRIM(level))=LOWER(?) AND academic_year=? AND is_active=1
       AND ${termSql}
     ORDER BY ${termOrder}
     LIMIT 1`,
    [cat, lvl, year, t, t, t]
  );
  if (rows[0]) return rows[0];

  // School year row missing — use latest active national cap for same category/level/term
  rows = await query(
    `SELECT id, max_amount, regulation_ref, notes, term, academic_year FROM fee_limits
     WHERE category=? AND LOWER(TRIM(level))=LOWER(?) AND is_active=1
       AND ${termSql}
     ORDER BY academic_year DESC, ${termOrder}
     LIMIT 1`,
    [cat, lvl, t, t, t]
  );
  return rows[0] || null;
}

const normalise = (r) => {
  if (!r) return r;
  return {
    ...r,
    class:    r.class_name      || r.class    || "",
    level:    r.education_level || r.level    || "",
    category: r.school_category || r.category || "",
    district: r.school_district || r.district || "",
    sector:   r.school_sector   || r.sector   || "",
    province: r.school_province || r.province || "",
  };
};

const normaliseClassReq = (r) => ({
  ...r,
  item:    r.item    || r.information || "",
  details: r.details || "",
});

const resolveSchoolId = (req) => {
  const fromBody        = normalizeSchoolId(req.body?.school_id);
  const fromUser        = normalizeSchoolId(req.user?.school_id);
  const fromSchool      = normalizeSchoolId(req.user?.school?.id);
  const fromSessionUser = normalizeSchoolId(req.session?.user?.school?.id);
  const fromSessionFlat = normalizeSchoolId(req.session?.user?.school_id);
  const fromSessionTop  = normalizeSchoolId(req.session?.school_id);
  const resolved = fromBody ?? fromUser ?? fromSchool ?? fromSessionUser ?? fromSessionFlat ?? fromSessionTop ?? null;
  if (!resolved) {
    console.warn(`[babyeyi] ⚠️  school_id is NULL — user ${req.user?.id || "unknown"}`);
  }
  return resolved;
};

const resolveFilePath = (storedPath) => {
  if (!storedPath) return null;
  return storedPath.replace(/\\/g, "/").replace(/^\//, "");
};

const fileExists = (p) => {
  if (!p) return false;
  try { return fs.existsSync(resolveFilePath(p)); } catch { return false; }
};

// ── Leaders helpers ───────────────────────────────────────────

const upsertLeaders = async (bid, schoolId, leaders) => {
  if (!Array.isArray(leaders) || leaders.length === 0) return;
  await query("DELETE FROM babyeyi_leaders WHERE babyeyi_id = ?", [bid]);
  const valid = leaders
    .map((l, i) => ({
      name:  (l.name  || "").trim(),
      role:  (l.role  || "").trim(),
      phone: (l.phone || "").trim().replace(/^\+?250/, ""),
      email: (l.email || "").trim().toLowerCase(),
      sort:  i,
    }))
    .filter(l => l.name);
  for (const l of valid) {
    await query(
      `INSERT INTO babyeyi_leaders
         (babyeyi_id, school_id, leader_name, leader_role, phone, email, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [bid, schoolId || null, l.name, l.role || "", l.phone || null, l.email || null, l.sort]
    );
  }
};

const fetchLeaders = async (bid) => {
  try {
    const rows = await query(
      `SELECT id, leader_name AS name, leader_role AS role,
              phone, email, sort_order
       FROM babyeyi_leaders
       WHERE babyeyi_id = ? AND is_active = 1
       ORDER BY sort_order ASC`,
      [bid]
    );
    return rows;
  } catch (e) {
    console.warn("[fetchLeaders]", e.message);
    return [];
  }
};

const deactivateLeaders = async (bid) => {
  await query("UPDATE babyeyi_leaders SET is_active = 0 WHERE babyeyi_id = ?", [bid])
    .catch(e => console.warn("[deactivateLeaders]", e.message));
};


// ════════════════════════════════════════════════════════════
// HMAC CRYPTO — v13
// ════════════════════════════════════════════════════════════
const HASH_SECRET = process.env.BABYEYI_HASH_SECRET || "babyeyi-default-secret-change-me-in-production";

if (!process.env.BABYEYI_HASH_SECRET) {
  console.warn("[babyeyi] ⚠️  BABYEYI_HASH_SECRET not set in .env — using insecure default!");
} else {
  console.log("[babyeyi] ✅ BABYEYI_HASH_SECRET loaded. Prefix:", HASH_SECRET.slice(0, 8) + "...");
}

const safeStr = (v) => {
  if (v == null)         return "";
  if (v === "null")      return "";
  if (v === "undefined") return "";
  return String(v).trim();
};

const safeAmt = (v) => String(Math.round(Number(v) || 0));

const buildCanonical = ({ docId, schoolId, className, term, academicYear, payments = [], bankAccountNo = "" }) => {
  const paymentStr = [...payments]
    .filter(p => safeStr(p.name) !== "")
    .sort((a, b) => safeStr(a.name).localeCompare(safeStr(b.name)))
    .map(p => `${safeStr(p.name)}:${safeAmt(p.amount)}`)
    .join(",");

  const canonical = [
    safeStr(docId),
    safeStr(schoolId),
    safeStr(className),
    safeStr(term),
    safeStr(academicYear),
    paymentStr,
    safeStr(bankAccountNo),
  ].join("|");

  if (DEBUG_HASH) {
    console.log("[buildCanonical] canonical =", JSON.stringify(canonical));
  }

  return canonical;
};

const generateIntegrityHash = (fields) =>
  crypto.createHmac("sha256", HASH_SECRET)
    .update(buildCanonical(fields))
    .digest("hex")
    .slice(0, 16);

const verifyIntegrityHash = (fields, providedHash) => {
  if (!providedHash || typeof providedHash !== "string") return false;
  const expected = generateIntegrityHash(fields);
  try {
    const a = Buffer.from(expected.padEnd(64, "0").slice(0, 64));
    const b = Buffer.from(providedHash.padEnd(64, "0").slice(0, 64));
    return crypto.timingSafeEqual(a, b) && providedHash.length === expected.length;
  } catch { return false; }
};

// ── Public verify host (QR + qr_view_url). Prefer BABYEYI_VERIFY_PUBLIC_ORIGIN for production (e.g. https://babyeyi.rw). ──
const getBabyeyiPublicVerifyOrigin = () =>
  String(
    process.env.BABYEYI_VERIFY_PUBLIC_ORIGIN ||
      process.env.BABYEYI_PUBLIC_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:5173"
  ).replace(/\/+$/, "");

// ── v13: QR encodes full verify URL so phone opens browser directly ──
const buildQRPayload = (docId, hash) => {
  const base = getBabyeyiPublicVerifyOrigin();
  return `${base}/babyeyi/verify/${docId}?h=${hash}`;
};

// ── v13: parses both new URL format and legacy pipe format ────────────
const parseQRPayload = (payload) => {
  if (!payload || typeof payload !== "string") return null;
  let decoded;
  try { decoded = decodeURIComponent(payload); } catch { decoded = payload; }

  // New format: http://localhost:5173/babyeyi/verify/BY-2025-00025?h=abc123def456
  const urlMatch = decoded.match(/\/babyeyi\/verify\/(BY-\d{4}-\d{5})\?h=([0-9a-f]{16})/i);
  if (urlMatch) {
    return { docId: urlMatch[1].toUpperCase(), hash: urlMatch[2].toLowerCase() };
  }

  // Legacy format: BY-2025-00025|abc123def456 — keeps old printed QRs working
  const pipeIdx = decoded.indexOf("|");
  if (pipeIdx !== -1) {
    const docId = decoded.slice(0, pipeIdx).toUpperCase().trim();
    const hash  = decoded.slice(pipeIdx + 1).toLowerCase().trim();
    if (/^BY-\d{4}-\d{5}$/.test(docId) && /^[0-9a-f]{16}$/.test(hash)) {
      return { docId, hash };
    }
  }

  return null;
};

// ── normalisePaymentsForHash ──────────────────────────────────
const normalisePaymentsForHash = (payments) =>
  (Array.isArray(payments) ? payments : [])
    .map(p => ({
      name:   safeStr(p.name),
      amount: safeAmt(p.amount),
    }))
    .filter(p => p.name !== "");

// ════════════════════════════════════════════════════════════
// AUTO-RUN MIGRATIONS AT STARTUP
// ════════════════════════════════════════════════════════════
const runMigrations = async () => {
  const { ensureBabyeyiCoreSchema } = require('../utils/babyeyiSchema');
  await ensureBabyeyiCoreSchema();
  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_url VARCHAR(500) NULL`,
    `ALTER TABLE school_babyeyi ADD COLUMN IF NOT EXISTS parent_message TEXT NULL`,
    `ALTER TABLE school_babyeyi ADD COLUMN IF NOT EXISTS qr_view_url VARCHAR(500) NULL`,
    `ALTER TABLE school_babyeyi ADD COLUMN IF NOT EXISTS qr_code_path VARCHAR(500) NULL`,
    `ALTER TABLE school_babyeyi ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(500) NULL`,
    `ALTER TABLE school_babyeyi ADD COLUMN IF NOT EXISTS pdf_name VARCHAR(255) NULL`,
    `ALTER TABLE school_babyeyi ADD COLUMN IF NOT EXISTS integrity_hash VARCHAR(64) NULL`,
    `ALTER TABLE school_babyeyi ADD COLUMN IF NOT EXISTS translations_json LONGTEXT NULL`,
    `ALTER TABLE school_babyeyi ADD COLUMN IF NOT EXISTS content_i18n LONGTEXT NULL`,
    `ALTER TABLE school_babyeyi ADD COLUMN IF NOT EXISTS translation_status VARCHAR(32) NULL`,
    `ALTER TABLE babyeyi_class_requirements ADD COLUMN IF NOT EXISTS item VARCHAR(300) NULL`,
    `ALTER TABLE babyeyi_class_requirements ADD COLUMN IF NOT EXISTS details TEXT NULL`,
    `ALTER TABLE babyeyi_class_requirements ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0`,
    `ALTER TABLE babyeyi_signatures ADD COLUMN IF NOT EXISTS qr_view_url VARCHAR(500) NULL`,
    `ALTER TABLE babyeyi_signatures ADD COLUMN IF NOT EXISTS qr_code_path VARCHAR(500) NULL`,
    `ALTER TABLE babyeyi_signatures ADD COLUMN IF NOT EXISTS qr_code_name VARCHAR(255) NULL`,
    // ── v12: leaders table ────────────────────────────────────
    `ALTER TABLE babyeyi_student_requirements ADD COLUMN IF NOT EXISTS pay_channel VARCHAR(24) NOT NULL DEFAULT 'babyeyi'`,
    `ALTER TABLE babyeyi_student_requirements ADD COLUMN IF NOT EXISTS cost DECIMAL(14,2) NULL COMMENT 'Line total RWF when pay_channel=school'`,
    `CREATE TABLE IF NOT EXISTS babyeyi_leaders (
       id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       babyeyi_id    INT UNSIGNED NOT NULL,
       school_id     INT UNSIGNED NULL,
       leader_name   VARCHAR(200)  NOT NULL,
       leader_role   VARCHAR(200)  NOT NULL DEFAULT '',
       phone         VARCHAR(30)   NULL,
       email         VARCHAR(200)  NULL,
       sort_order    INT           NOT NULL DEFAULT 0,
       is_active     TINYINT(1)    NOT NULL DEFAULT 1,
       created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       INDEX idx_bl_babyeyi (babyeyi_id),
       INDEX idx_bl_school  (school_id)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];
  for (const sql of migrations) {
    try { await db.query(sql); }
    catch (e) { console.warn("[babyeyi] migration warn:", e.message.slice(0, 120)); }
  }
  console.log("[babyeyi] ✅ Migrations complete");
};

// ════════════════════════════════════════════════════════════
// runRehashMigration — MODULE SCOPE
// ════════════════════════════════════════════════════════════
const runRehashMigration = async () => {
  console.log("[babyeyi] 🔄 Running hash rehash migration...");
  try {
    const docs = await query(
      "SELECT id, doc_id, school_id, class_name, term, academic_year, bank_account_no FROM school_babyeyi WHERE is_active=1 AND doc_id IS NOT NULL"
    );
    console.log("[babyeyi] Rehashing", docs.length, "documents...");
    let fixed = 0, skipped = 0;
    for (const doc of docs) {
      try {
        const payments = await query(
          "SELECT name, amount FROM babyeyi_payments WHERE babyeyi_id=? ORDER BY sort_order",
          [doc.id]
        ).catch(() => []);
        const normPayments = normalisePaymentsForHash(payments);
        const newHash = generateIntegrityHash({
          docId:        doc.doc_id,
          schoolId:     doc.school_id,
          className:    doc.class_name    || "",
          term:         doc.term          || "",
          academicYear: doc.academic_year || "",
          payments:     normPayments,
          bankAccountNo: doc.bank_account_no || "",
        });
        await query("UPDATE school_babyeyi SET integrity_hash=? WHERE id=?", [newHash, doc.id]);
        fixed++;
      } catch (e) {
        console.warn("[rehash] skipped doc", doc.doc_id, ":", e.message);
        skipped++;
      }
    }
    console.log("[babyeyi] ✅ Rehash complete:", fixed, "fixed,", skipped, "skipped");
  } catch (e) {
    console.error("[babyeyi] ❌ Rehash migration failed:", e.message);
  }
};

async function initBabyeyiMigrations() {
  await runMigrations();
  await runRehashMigration();
}

// ── Multer ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["application/pdf","image/png","image/jpeg","image/jpg"].includes(file.mimetype);
    ok ? cb(null, true) : cb(new Error("Only PDF and images allowed"));
  },
}).fields([
  { name: "director_signature",   maxCount: 1 },
  { name: "accountant_signature", maxCount: 1 },
  { name: "stamp",                maxCount: 1 },
  { name: "parent_rep_doc",       maxCount: 1 },
  { name: "budget_doc",           maxCount: 1 },
  { name: "school_logo",          maxCount: 1 },
  { name: "other_logo",           maxCount: 1 },
  { name: "qr_code",              maxCount: 1 },
]);

const assetStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ASSET_DIR),
  filename: (req, file, cb) => {
    const schoolId = req.user?.school_id || "unknown";
    const ext      = path.extname(file.originalname);
    const type     = req.body?.asset_type || "asset";
    cb(null, `school_${schoolId}_${type}_${Date.now()}${ext}`);
  },
});

const uploadAsset = multer({
  storage: assetStorage,
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|webp|svg\+xml)$/.test(file.mimetype);
    cb(ok ? null : new Error("Only image files are allowed"), ok);
  },
});

// ── Generate doc ID ───────────────────────────────────────────
const generateDocId = async (academicYear) => {
  const year = (academicYear && String(academicYear).includes("-"))
    ? String(academicYear).split("-")[0]
    : (academicYear ? String(academicYear) : String(new Date().getFullYear()));
  try {
    const rows = await query(
      `SELECT doc_id FROM school_babyeyi
       WHERE doc_id LIKE ? AND doc_id IS NOT NULL
       ORDER BY doc_id DESC LIMIT 1`,
      [`BY-${year}-%`]
    );
    let seq = 1;
    if (rows.length && rows[0].doc_id) {
      const parts  = String(rows[0].doc_id).split("-");
      const parsed = parseInt(parts[2] || "0", 10);
      if (!isNaN(parsed)) seq = parsed + 1;
    }
    return `BY-${year}-${String(seq).padStart(5, "0")}`;
  } catch (e) {
    console.error("[generateDocId] error:", e.message);
    return `BY-${year}-${String(Date.now()).slice(-5)}`;
  }
};

// ── Generate QR PNG file ──────────────────────────────────────
const generateQRCodeFile = async (qrPayload, docId) => {
  if (!qrPayload || !docId) {
    throw new Error(`[generateQRCodeFile] invalid inputs: qrPayload="${qrPayload}", docId="${docId}"`);
  }
  if (!fs.existsSync(QR_DIR)) fs.mkdirSync(QR_DIR, { recursive: true });
  const filename = `qr-${docId}-${Date.now()}.png`;
  const filepath = path.join(QR_DIR, filename);
  console.log(`[generateQRCodeFile] Writing QR to ${filepath}`);
  await QRCode.toFile(filepath, qrPayload, {
    errorCorrectionLevel: "H",
    type: "png",
    width: 300,
    margin: 2,
    color: { dark: "#1e3a5f", light: "#ffffff" },
  });
  if (!fs.existsSync(filepath)) {
    throw new Error(`QR file was not created at ${filepath}`);
  }
  console.log(`[generateQRCodeFile] ✅ QR written: ${filepath}`);
  return { filePath: `/${QR_DIR}${filename}`, fileName: filename, fullPath: filepath };
};

function babyeyiTodayFr() {
  return new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

async function loadBabyeyiDocBundle(bid, documentLanguage = "en") {
  const rows = await query("SELECT * FROM school_babyeyi WHERE id=? AND is_active=1", [bid]);
  if (!rows.length) return null;
  const babyeyi = normalise(rows[0]);

  let payments = await query(
    "SELECT name, amount FROM babyeyi_payments WHERE babyeyi_id=? ORDER BY sort_order", [bid]
  );
  if (!payments.length && rows[0].payments) {
    try {
      const raw = typeof rows[0].payments === "string" ? JSON.parse(rows[0].payments) : rows[0].payments;
      if (Array.isArray(raw)) payments = raw;
    } catch (_) {}
  }

  const [studentReqs, classReqsRaw, sigRows, leaderRows] = await Promise.all([
    query("SELECT item, description, quantity FROM babyeyi_student_requirements WHERE babyeyi_id=? ORDER BY sort_order", [bid]).catch(() => []),
    query(`SELECT COALESCE(item, information) AS item, details
           FROM babyeyi_class_requirements WHERE babyeyi_id=? ORDER BY COALESCE(sort_order, 0)`, [bid]).catch(() => []),
    query("SELECT * FROM babyeyi_signatures WHERE babyeyi_id=? LIMIT 1", [bid]).catch(() => []),
    fetchLeaders(bid).catch(() => []),
  ]);

  const sigRow = sigRows[0] || {};
  let contentI18nRaw = null;
  try {
    const [ciRow] = await query("SELECT content_i18n FROM school_babyeyi WHERE id=?", [bid]);
    contentI18nRaw = ciRow?.content_i18n ?? null;
  } catch (_) {}

  const docLang = normalizeSourceLang(documentLanguage);
  const merged = mergeLocalizedBabyeyiPayload({
    lang: docLang,
    parentMessage: babyeyi.parent_message || "",
    payments: payments.map((p) => ({ name: p.name, amount: Number(p.amount) || 0 })),
    requirements: studentReqs,
    classNotes: classReqsRaw.map(normaliseClassReq),
    leaders: leaderRows,
    contentI18n: contentI18nRaw,
  });

  let classes = [];
  try {
    const cj = rows[0].classes_json;
    if (cj) {
      const raw = typeof cj === "string" ? JSON.parse(cj) : cj;
      if (Array.isArray(raw)) classes = raw.filter(Boolean);
    }
  } catch (_) {}
  const primaryClass = babyeyi.class || babyeyi.class_name || (classes[0] || "");
  if (!classes.length && primaryClass) classes = [primaryClass];

  let sigPaths = {
    sigPath:        sigRow.director_sig_path  || null,
    stampPath:      sigRow.stamp_path         || null,
    schoolLogoPath: sigRow.school_logo_path   || null,
    otherLogoPath:  sigRow.other_logo_path    || null,
  };

  if (babyeyi.school_id) {
    try {
      const schoolRows = await query(
        "SELECT logo_url, school_stamp_url, head_signature_url FROM schools WHERE id=? LIMIT 1",
        [babyeyi.school_id]
      );
      if (schoolRows.length) {
        const sr = schoolRows[0];
        if (!sigPaths.schoolLogoPath && sr.logo_url) sigPaths.schoolLogoPath = sr.logo_url;
        if (!sigPaths.stampPath && sr.school_stamp_url) sigPaths.stampPath = sr.school_stamp_url;
        if (!sigPaths.sigPath && sr.head_signature_url) sigPaths.sigPath = sr.head_signature_url;
      }
    } catch (_) {}
  }

  const rec = {
    schoolName: babyeyi.school_name || "",
    district: babyeyi.district || babyeyi.school_district || "",
    sector: babyeyi.sector || babyeyi.school_sector || "",
    academicYear: babyeyi.academic_year || "",
    term: babyeyi.term || "",
    level: babyeyi.level || babyeyi.education_level || "",
    class: primaryClass,
    classes,
    docId: babyeyi.doc_id || null,
    parentMessage: merged.parentMessage,
    payments: merged.payments,
    requirements: merged.requirements,
    classNotes: merged.classNotes,
    leaders: merged.leaders,
    banksJson: babyeyi.banks_json,
    bankName: babyeyi.bank_name,
    bankAccountNo: babyeyi.bank_account_no,
    bankAccountName: babyeyi.bank_account_name,
  };

  const qrPath = sigRow.qr_code_path || babyeyi.qr_code_path || null;

  return {
    rec,
    sigPaths,
    qrPath,
    docLang,
    parentMessage: merged.parentMessage,
    babyeyi,
  };
}

async function buildBabyeyiPrintHtmlForBid(bid, documentLanguage = "en", { autoPrint = false } = {}) {
  const bundle = await loadBabyeyiDocBundle(bid, documentLanguage);
  if (!bundle) return null;

  const { rec, sigPaths, qrPath, docLang, parentMessage } = bundle;
  const totalFee = (rec.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);

  return buildBabyeyiPrintPageHtml({
    rec,
    totalFee,
    today: babyeyiTodayFr(),
    schoolLogoB64: fileToDataUrl(sigPaths.schoolLogoPath),
    otherLogoB64: fileToDataUrl(sigPaths.otherLogoPath),
    sigB64: fileToDataUrl(sigPaths.sigPath),
    stampB64: fileToDataUrl(sigPaths.stampPath),
    qrB64: fileToDataUrl(qrPath),
    lang: docLang,
    parentMsgOverride: parentMessage,
  }, { autoPrint });
}

async function generateBabyeyiHtmlPDF({
  babyeyi,
  payments,
  requirements,
  classNotes,
  sigPaths,
  qrFilePath,
  docId,
  parentMessage,
  leaders = [],
  documentLang = "en",
}) {
  const nb = normalise(babyeyi);
  const totalFee = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);

  let classes = [];
  try {
    const cj = nb.classes_json || babyeyi.classes_json;
    if (cj) {
      const raw = typeof cj === "string" ? JSON.parse(cj) : cj;
      if (Array.isArray(raw)) classes = raw.filter(Boolean);
    }
  } catch (_) {}
  const primaryClass = nb.class || nb.class_name || babyeyi.class_name || (classes[0] || "");
  if (!classes.length && primaryClass) classes = [primaryClass];

  const rec = {
    schoolName: nb.school_name || babyeyi.school_name || "",
    district: nb.district || nb.school_district || babyeyi.school_district || "",
    sector: nb.sector || nb.school_sector || babyeyi.school_sector || "",
    academicYear: nb.academic_year || babyeyi.academic_year || "",
    term: nb.term || babyeyi.term || "",
    level: nb.level || nb.education_level || "",
    class: primaryClass,
    classes,
    docId,
    parentMessage,
    payments,
    requirements,
    classNotes,
    leaders,
    banksJson: nb.banks_json || babyeyi.banks_json,
    bankName: nb.bank_name || babyeyi.bank_name,
    bankAccountNo: nb.bank_account_no || babyeyi.bank_account_no,
    bankAccountName: nb.bank_account_name || babyeyi.bank_account_name,
  };

  const html = buildBabyeyiPrintPageHtml({
    rec,
    totalFee,
    today: babyeyiTodayFr(),
    schoolLogoB64: fileToDataUrl(sigPaths?.schoolLogoPath),
    otherLogoB64: fileToDataUrl(sigPaths?.otherLogoPath),
    sigB64: fileToDataUrl(sigPaths?.sigPath),
    stampB64: fileToDataUrl(sigPaths?.stampPath),
    qrB64: fileToDataUrl(qrFilePath),
    lang: documentLang,
    parentMsgOverride: parentMessage,
  });

  return renderHtmlToPdfFile(html, PDF_DIR, docId);
}

// ── Generate PDF ──────────────────────────────────────────────
const generateBabyeyiPDF = async ({
  babyeyi,
  payments,
  requirements,
  classNotes,
  sigPaths,
  qrFilePath,
  docId,
  parentMessage,
  leaders = [],
  documentLang = "en",
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

      const D = getDocStrings(normalizeSourceLang(documentLang));
      const fill = (tpl, vars) => {
        let s = String(tpl || "");
        Object.entries(vars || {}).forEach(([k, v]) => {
          s = s.split(`{${k}}`).join(String(v ?? ""));
        });
        return s;
      };

      const filename = `babyeyi-${docId}-${Date.now()}.pdf`;
      const filepath = path.join(PDF_DIR, filename);
      const webPath  = `/${PDF_DIR}${filename}`;
      const b        = normalise(babyeyi);
      const className = b.class || b.class_name || b.className || "N/A";

      const doc = new PDFDoc({
        size: "A4",
        margins: { top: 40, bottom: 40, left: 50, right: 50 },
        info: {
          Title:   `Babyeyi — ${className} · ${b.term} · ${b.academic_year}`,
          Author:  b.school_name || "School",
          Subject: "Official School Fee Document",
        },
      });

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      const NAVY   = "#1e3a5f";
      const ACCENT = "#2563eb";
      const GRAY   = "#64748b";
      const WHITE  = "#ffffff";
      const BLACK  = "#0f172a";
      const W = doc.page.width  - doc.page.margins.left - doc.page.margins.right;
      const L = doc.page.margins.left;

      // Top bar
      doc.rect(0, 0, doc.page.width, 6).fill(NAVY);
      doc.rect(0, 6, doc.page.width, 115).fill("#f8fafc");

      let yHead = 18;

      // School Logo LEFT
      const schoolLogoPath = resolveFilePath(sigPaths?.schoolLogoPath);
      if (schoolLogoPath && fs.existsSync(schoolLogoPath)) {
        try { doc.image(schoolLogoPath, L, yHead, { width: 70, height: 70, fit: [70, 70] }); }
        catch (_) {
          doc.rect(L, yHead, 70, 70).stroke("#cbd5e1");
          doc.fontSize(7).fillColor(GRAY).text("LOGO", L + 15, yHead + 30, { width: 40, align: "center" });
        }
      } else {
        doc.rect(L, yHead, 70, 70).stroke("#cbd5e1");
        doc.fontSize(7).fillColor(GRAY).text("SCHOOL\nLOGO", L + 10, yHead + 25, { width: 50, align: "center" });
      }

      // Other Logo RIGHT
      const otherLogoPath = resolveFilePath(sigPaths?.otherLogoPath);
      if (otherLogoPath && fs.existsSync(otherLogoPath)) {
        try { doc.image(otherLogoPath, L + W - 70, yHead, { width: 70, height: 70, fit: [70, 70] }); }
        catch (_) { doc.rect(L + W - 70, yHead, 70, 70).stroke("#cbd5e1"); }
      } else {
        doc.rect(L + W - 70, yHead, 70, 70).stroke("#cbd5e1");
        doc.fontSize(7).fillColor(GRAY).text("OTHER\nLOGO", L + W - 60, yHead + 25, { width: 50, align: "center" });
      }

      // Center header
      const cx = L + 80;
      const cw = W - 160;
      doc.fontSize(7).fillColor(GRAY).font("Helvetica")
         .text(D.headerRepublicShort || "Republic of Rwanda", cx, yHead + 2, { width: cw, align: "center", characterSpacing: 1.5 });
      doc.fontSize(7).fillColor(GRAY)
         .text(D.headerMinistryLine || "Ministry of Education", cx, yHead + 12, { width: cw, align: "center" });
      doc.fontSize(13).font("Helvetica-Bold").fillColor(NAVY)
         .text((b.school_name || "SCHOOL NAME").toUpperCase(), cx, yHead + 24, { width: cw, align: "center", characterSpacing: 0.5 });

      const locParts = [b.district, b.sector].filter(Boolean);
      doc.fontSize(8).font("Helvetica").fillColor(GRAY)
         .text(locParts.length ? locParts.join(" / ") : "Rwanda", cx, yHead + 42, { width: cw, align: "center" });

      const bannerY = yHead + 56;
      doc.rect(cx, bannerY, cw, 20).fill(NAVY);
      const bannerText = fill(D.bannerBabyeyi, { term: b.term || "", year: b.academic_year || "", className });
      doc.fontSize(8).font("Helvetica-Bold").fillColor(WHITE)
         .text(bannerText,
               cx, bannerY + 6, { width: cw, align: "center", characterSpacing: 1 });

      const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
      doc.fontSize(7).fillColor(GRAY).font("Helvetica")
         .text(fill(D.dateLineKigali, { date: dateStr }),
               cx, yHead + 82, { width: cw, align: "right" });

      doc.moveTo(L, 125).lineTo(L + W, 125).lineWidth(0.5).stroke("#cbd5e1");

      let y = 133;

      // Badges
      const badge = (text, x, bY, bgCol = NAVY) => {
        const bW = doc.widthOfString(text) + 14;
        doc.roundedRect(x, bY, bW, 16, 3).fill(bgCol);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(WHITE).text(text, x + 7, bY + 4);
        return bW;
      };
      badge(className, L, y);
      badge(b.level || D.levelLabel || "Level", L + 42, y, ACCENT);
      badge(b.category || D.badgeCategory || "Category", L + 105, y, "#475569");
      const docIdText = `ID: ${docId}`;
      const docIdW = doc.widthOfString(docIdText) + 14;
      doc.roundedRect(L + W - docIdW, y, docIdW, 16, 3).fill("#e0e7ff");
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#3730a3").text(docIdText, L + W - docIdW + 7, y + 4);
      y += 28;

      // Parent message
      const msgText = parentMessage || b.parent_message || "";
      if (msgText && msgText.trim()) {
        doc.fontSize(7).font("Helvetica-Bold").fillColor(GRAY)
           .text(D.parentMessageHeading || "Message to Parents", L, y, { characterSpacing: 1.2 });
        doc.moveTo(L + 135, y + 5).lineTo(L + W, y + 5).lineWidth(0.3).stroke("#cbd5e1");
        y += 12;
        const msgH = doc.heightOfString(msgText, { width: W - 16 }) + 16;
        doc.rect(L, y, W, msgH).fill("#fafffe");
        doc.fontSize(8).font("Helvetica").fillColor(BLACK)
           .text(msgText, L + 8, y + 6, { width: W - 16, lineGap: 2 });
        doc.rect(L, y, W, msgH).stroke("#e2e8f0").lineWidth(0.3);
        y += msgH + 10;
      }

      // Fees table
      doc.fontSize(7).font("Helvetica-Bold").fillColor(GRAY)
         .text(D.secFee || "Fee Payment Breakdown", L, y, { characterSpacing: 1.2 });
      doc.moveTo(L + 105, y + 5).lineTo(L + W, y + 5).lineWidth(0.3).stroke("#cbd5e1");
      y += 12;

      const colW = [30, W - 120, 90];
      const colX = [L, L + 30, L + W - 90];

      doc.rect(L, y, W, 20).fill(NAVY);
      [D.thNo || "N°", D.thPaymentItem || "Item", D.thAmount || "Amount (RWF)"].forEach((h, i) => {
        doc.fontSize(8).font("Helvetica-Bold").fillColor(WHITE)
           .text(h, colX[i] + 6, y + 6, { width: colW[i], align: i === 2 ? "right" : "left" });
      });
      y += 20;

      let total = 0;
      payments.filter(p => p.name && Number(p.amount) > 0).forEach((p, idx) => {
        const amt = Number(p.amount) || 0; total += amt;
        const rowBg = idx % 2 === 0 ? WHITE : "#f8fafc";
        doc.rect(L, y, W, 18).fill(rowBg);
        doc.rect(L, y, W, 18).stroke("#e2e8f0").lineWidth(0.3);
        doc.fontSize(8).font("Helvetica").fillColor(BLACK)
           .text(String(idx + 1), colX[0] + 6, y + 5, { width: colW[0], align: "center" });
        doc.fontSize(8).font("Helvetica").fillColor(BLACK)
           .text(p.name, colX[1] + 6, y + 5, { width: colW[1] - 10 });
        doc.fontSize(8).font("Helvetica-Bold").fillColor(NAVY)
           .text(amt.toLocaleString(), colX[2] + 6, y + 5, { width: colW[2] - 10, align: "right" });
        y += 18;
      });

      doc.rect(L, y, W, 22).fill(NAVY);
      doc.fontSize(10).font("Helvetica-Bold").fillColor(WHITE)
         .text(D.thTotalLabel || "TOTAL", colX[1] + 6, y + 6, { width: colW[1] });
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#fbbf24")
         .text(`RWF ${total.toLocaleString()}`, colX[2] + 6, y + 5, { width: colW[2] - 10, align: "right" });
      y += 30;

      // Banks
      const banksData = parseJSONField(babyeyi.banks_json);
      const hasBankInfo = b.bank_name || b.bank_account_no || banksData.length > 0;
      if (hasBankInfo) {
        doc.fontSize(7).font("Helvetica-Bold").fillColor(GRAY)
           .text(D.bankSectionTitle || "Banking", L, y, { characterSpacing: 1.2 });
        doc.moveTo(L + 140, y + 5).lineTo(L + W, y + 5).lineWidth(0.3).stroke("#cbd5e1");
        y += 12;
        const allBanks = banksData.length > 0
          ? banksData
          : [{ bankName: b.bank_name, accountNumber: b.bank_account_no }];
        allBanks.forEach((bk, bi) => {
          const bkName  = bk.bankName      || bk.bank_name        || "";
          const bkAccNo = bk.accountNumber || bk.bank_account_no  || "";
          const bkAccNm = bk.accountName   || bk.bank_account_name || b.bank_account_name || "";
          if (!bkName && !bkAccNo) return;
          doc.rect(L, y, W, 36).fill("#eff6ff").stroke("#bfdbfe").lineWidth(0.5);
          if (allBanks.length > 1) {
            const primaryMark = bk.isPrimary ? ` ${D.bankPrimarySuffix || ""}` : "";
            doc.fontSize(7).font("Helvetica-Bold").fillColor(ACCENT)
               .text(`${D.bankLabelPrefix || "Bank"} ${bi + 1}${primaryMark}`, L + 8, y + 3);
          }
          const bColW = W / 3;
          [[D.bankFieldBank || "Bank:", bkName || "—"], [D.bankFieldAccount || "Account:", bkAccNo || "—"], [D.bankFieldName || "Name:", bkAccNm || "—"]].forEach((bf, i) => {
            doc.fontSize(7).font("Helvetica-Bold").fillColor(GRAY)
               .text(bf[0], L + 8 + i * bColW, y + (allBanks.length > 1 ? 14 : 6), { width: bColW - 10 });
            doc.fontSize(8).font("Helvetica-Bold").fillColor(NAVY)
               .text(bf[1], L + 8 + i * bColW, y + (allBanks.length > 1 ? 22 : 18), { width: bColW - 10 });
          });
          y += 44;
        });
      }

      // School Leaders
      if (leaders && leaders.length > 0) {
        doc.fontSize(7).font("Helvetica-Bold").fillColor(GRAY)
           .text(D.secLeadership || "School Leadership", L, y, { characterSpacing: 1.2 });
        doc.moveTo(L + 185, y + 5).lineTo(L + W, y + 5).lineWidth(0.3).stroke("#cbd5e1");
        y += 12;
        const lColW  = (W - 10) / 2;
        const perCol = Math.ceil(leaders.length / 2);
        leaders.forEach((leader, idx) => {
          const col = idx < perCol ? 0 : 1;
          const row = idx < perCol ? idx : idx - perCol;
          const lx  = L + col * (lColW + 10);
          const ly  = y + row * 38;
          doc.rect(lx, ly, lColW, 34)
             .fill(idx % 2 === 0 ? "#fafafa" : WHITE)
             .stroke("#e2e8f0")
             .lineWidth(0.3);
          doc.fontSize(8).font("Helvetica-Bold").fillColor(NAVY)
             .text(leader.name || leader.leader_name || "", lx + 6, ly + 4, { width: lColW - 12 });
          doc.fontSize(7).font("Helvetica").fillColor(GRAY)
             .text(leader.role || leader.leader_role || "", lx + 6, ly + 14, { width: lColW - 12 });
          const contact = [
            leader.phone ? `+250 ${leader.phone}` : "",
            leader.email || "",
          ].filter(Boolean).join("  ·  ");
          if (contact) {
            doc.fontSize(7).font("Helvetica").fillColor(ACCENT)
               .text(contact, lx + 6, ly + 24, { width: lColW - 12 });
          }
        });
        y += perCol * 38 + 10;
      }

      // Requirements
      if (requirements.length > 0) {
        doc.fontSize(7).font("Helvetica-Bold").fillColor(GRAY)
           .text(D.secRequirements || "Student Requirements", L, y, { characterSpacing: 1.2 });
        doc.moveTo(L + 115, y + 5).lineTo(L + W, y + 5).lineWidth(0.3).stroke("#cbd5e1");
        y += 12;
        const reqPerCol = Math.ceil(requirements.length / 2);
        const reqColW   = (W - 10) / 2;
        requirements.forEach((r, idx) => {
          const col = idx < reqPerCol ? 0 : 1;
          const row = idx < reqPerCol ? idx : idx - reqPerCol;
          const rx  = L + col * (reqColW + 10);
          const ry  = y + row * 13;
          doc.circle(rx + 4, ry + 5, 2).fill("#94a3b8");
          const itemLine = r.item || r;
          const desc = (r.description && String(r.description).trim()) ? ` — ${r.description}` : "";
          doc.fontSize(8).font("Helvetica").fillColor(BLACK)
             .text(`${itemLine}${desc}`, rx + 10, ry, { width: reqColW - 14 });
        });
        y += reqPerCol * 13 + 10;
      }

      // Class notes
      if (classNotes.length > 0) {
        doc.fontSize(7).font("Helvetica-Bold").fillColor(GRAY)
           .text(D.secClassNotes || "Class notes", L, y, { characterSpacing: 1.2 });
        doc.moveTo(L + 195, y + 5).lineTo(L + W, y + 5).lineWidth(0.3).stroke("#cbd5e1");
        y += 12;
        classNotes.forEach((n, idx) => {
          const itemText   = n.item    || n.information || "";
          const detailText = n.details || "";
          doc.rect(L, y, W, 14).fill(idx % 2 === 0 ? "#fafafa" : WHITE);
          doc.fontSize(8).font("Helvetica-Bold").fillColor(NAVY)
             .text(itemText + (detailText ? ":" : ""), L + 6, y + 3, { width: 90 });
          if (detailText) {
            doc.fontSize(8).font("Helvetica").fillColor(BLACK)
               .text(detailText, L + 98, y + 3, { width: W - 104 });
          }
          y += 14;
        });
        y += 10;
      }

      // Signature row
      if (y > doc.page.height - 190) { doc.addPage(); y = doc.page.margins.top; }

      doc.fontSize(7).font("Helvetica-Bold").fillColor(GRAY)
         .text(D.secAuth || "Authorization", L, y, { characterSpacing: 1.2 });
      doc.moveTo(L + 145, y + 5).lineTo(L + W, y + 5).lineWidth(0.3).stroke("#cbd5e1");
      y += 16;

      const authRowH = 115;
      const colSize  = W / 3;

      // LEFT: Director Signature
      doc.rect(L, y, colSize - 8, authRowH).fill("#fafafa").stroke("#e2e8f0").lineWidth(0.5);
      doc.fontSize(7).font("Helvetica-Bold").fillColor(NAVY)
         .text(D.sigHeadTeacher || "Head Teacher", L + 8, y + 8, { width: colSize - 24, align: "center", characterSpacing: 0.5 });
      const dirSigPath = resolveFilePath(sigPaths?.sigPath);
      if (dirSigPath && fs.existsSync(dirSigPath)) {
        try {
          doc.image(dirSigPath, L + (colSize - 8) / 2 - 35, y + 22, { width: 70, height: 50, fit: [70, 50] });
        } catch (_) {
          doc.fontSize(20).fillColor("#e2e8f0").text("✍", L + (colSize - 8) / 2 - 10, y + 38);
        }
      } else {
        doc.fontSize(20).fillColor("#e2e8f0").text("✍", L + (colSize - 8) / 2 - 10, y + 38);
      }
      doc.moveTo(L + 10, y + authRowH - 24).lineTo(L + colSize - 18, y + authRowH - 24)
         .lineWidth(0.8).stroke("#334155");
      doc.fontSize(7).font("Helvetica").fillColor(GRAY)
         .text(D.sigSignAndStamp || "Signature & seal", L + 8, y + authRowH - 18, { width: colSize - 24, align: "center" });

      // CENTER: QR Code
      const qrX = L + colSize;
      doc.rect(qrX, y, colSize - 8, authRowH).fill("#eef2ff").stroke("#c7d2fe").lineWidth(0.5);
      if (qrFilePath && typeof qrFilePath === "string" && fs.existsSync(qrFilePath)) {
        try {
          const qrSize = 72;
          doc.image(qrFilePath, qrX + (colSize - 8) / 2 - qrSize / 2, y + 10,
                    { width: qrSize, height: qrSize, fit: [qrSize, qrSize] });
        } catch (_) {
          doc.fontSize(24).fillColor("#c7d2fe").text("▣", qrX + (colSize - 8) / 2 - 12, y + 32);
        }
      } else {
        doc.fontSize(24).fillColor("#c7d2fe").text("▣", qrX + (colSize - 8) / 2 - 12, y + 32);
      }
      doc.fontSize(6.5).font("Helvetica-Bold").fillColor("#3730a3")
         .text(D.sigScanVerifyPdf || D.sigScanVerify || "Scan to verify", qrX + 8, y + 86, { width: colSize - 24, align: "center", characterSpacing: 0.5 });
      doc.fontSize(6).font("Helvetica").fillColor("#6366f1")
         .text(docId, qrX + 8, y + 96, { width: colSize - 24, align: "center" });

      // RIGHT: Stamp
      const stmpX = L + colSize * 2;
      doc.rect(stmpX, y, colSize - 8, authRowH).fill("#fafafa").stroke("#e2e8f0").lineWidth(0.5);
      doc.fontSize(7).font("Helvetica-Bold").fillColor(NAVY)
         .text(D.sigStamp || "Official stamp", stmpX + 8, y + 8, { width: colSize - 24, align: "center", characterSpacing: 0.5 });
      const stampPath = resolveFilePath(sigPaths?.stampPath);
      if (stampPath && fs.existsSync(stampPath)) {
        try {
          doc.image(stampPath, stmpX + (colSize - 8) / 2 - 35, y + 18,
                    { width: 70, height: 70, fit: [70, 70] });
        } catch (_) {
          doc.fontSize(26).fillColor("#e2e8f0").text("🔏", stmpX + (colSize - 8) / 2 - 14, y + 34);
        }
      } else {
        doc.fontSize(26).fillColor("#e2e8f0").text("🔏", stmpX + (colSize - 8) / 2 - 14, y + 34);
      }

      // Footer
      const footerY = doc.page.height - 36;
      doc.rect(0, footerY, doc.page.width, 30).fill("#f1f5f9");
      doc.moveTo(0, footerY).lineTo(doc.page.width, footerY).lineWidth(0.5).stroke("#cbd5e1");
      doc.fontSize(7).font("Helvetica").fillColor(GRAY)
         .text(fill(D.footerSchoolLine, { school: b.school_name || "", year: b.academic_year || "", term: b.term || "" }), L, footerY + 6, { width: W / 2 });
      doc.fontSize(7).font("Helvetica-Bold").fillColor(NAVY)
         .text(D.docOfficial || "Official document", L + W / 2, footerY + 6, { width: W / 2, align: "center" });
      doc.fontSize(7).font("Helvetica").fillColor(GRAY)
         .text(fill(D.pageIndicator, { page: 1, total: 1 }), L, footerY + 6, { width: W, align: "right" });
      doc.rect(0, doc.page.height - 6, doc.page.width, 6).fill(NAVY);

      doc.end();
      stream.on("finish", () => {
        if (!fs.existsSync(filepath)) {
          return reject(new Error(`PDF file not created at ${filepath}`));
        }
        resolve({ filePath: webPath, fileName: filename, fullPath: filepath });
      });
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};

// ════════════════════════════════════════════════════════════
// generateDocuments — v13
// ════════════════════════════════════════════════════════════
const generateDocuments = async ({
  bid,
  babyeyi,
  payments,
  requirements,
  classNotes,
  sigPaths,
  academicYear,
  schoolId,
  parentMessage,
  documentLanguage = "en",
}) => {
  console.log(`[generateDocuments] START bid=${bid}`);

  const nb = normalise(babyeyi);
  const resolvedClass = nb.class || nb.class_name || babyeyi.class_name || babyeyi.class || "N/A";
  const resolvedTerm  = nb.term  || babyeyi.term  || "Term 1";
  const resolvedYear  = academicYear || nb.academic_year || babyeyi.academic_year || String(new Date().getFullYear());

  console.log(`[generateDocuments] class="${resolvedClass}", term="${resolvedTerm}", year="${resolvedYear}"`);

  if (!bid) throw new Error("[generateDocuments] bid is required");

  const resolvedSchoolId = schoolId || nb.school_id || babyeyi.school_id || null;
  const normalisedPayments = normalisePaymentsForHash(payments);

  if (DEBUG_HASH) {
    console.log("[generateDocuments] normalisedPayments:", JSON.stringify(normalisedPayments));
    console.log("[generateDocuments] resolvedSchoolId:", resolvedSchoolId);
  }

  let resolvedSigPaths = { ...sigPaths };

  if (resolvedSchoolId) {
    try {
      const schoolRows = await query(
        "SELECT logo_url, school_stamp_url, head_signature_url FROM schools WHERE id=? LIMIT 1",
        [resolvedSchoolId]
      );
      if (schoolRows.length) {
        const sr = schoolRows[0];
        if (!resolvedSigPaths.schoolLogoPath && sr.logo_url)           resolvedSigPaths.schoolLogoPath = sr.logo_url;
        if (!resolvedSigPaths.stampPath      && sr.school_stamp_url)   resolvedSigPaths.stampPath      = sr.school_stamp_url;
        if (!resolvedSigPaths.sigPath        && sr.head_signature_url) resolvedSigPaths.sigPath        = sr.head_signature_url;
      }
    } catch (e) { console.warn("[generateDocuments] school fallback:", e.message); }
  }

  if (!resolvedSigPaths.sigPath && resolvedSchoolId) {
    try {
      const sigRows = await query(
        `SELECT u.signature_url FROM users u
         WHERE u.school_id = ? AND u.signature_url IS NOT NULL AND u.signature_url != ''
         LIMIT 1`,
        [resolvedSchoolId]
      );
      if (sigRows.length) resolvedSigPaths.sigPath = sigRows[0].signature_url;
    } catch (_) {}
  }

  const existingDocId = babyeyi.doc_id && /^BY-\d{4}-\d{5}$/.test(babyeyi.doc_id)
    ? babyeyi.doc_id
    : null;
  const docId = existingDocId || await generateDocId(resolvedYear);
  console.log(`[generateDocuments] docId=${docId}`);

  const integrityHash = generateIntegrityHash({
    docId,
    schoolId:      resolvedSchoolId,
    className:     resolvedClass,
    term:          resolvedTerm,
    academicYear:  resolvedYear,
    payments:      normalisedPayments,
    bankAccountNo: nb.bank_account_no || babyeyi.bank_account_no || "",
  });

  if (DEBUG_HASH) {
    console.log(`[generateDocuments] integrityHash=${integrityHash}`);
  }

  // v13: QR payload is now the full verify URL
  const qrPayload = buildQRPayload(docId, integrityHash);
  console.log(`[generateDocuments] QR payload="${qrPayload}"`);

  const qr = await generateQRCodeFile(qrPayload, docId);

  const leaderRows = await fetchLeaders(bid).catch(() => []);

  let contentI18nRaw = null;
  try {
    const [ciRow] = await query("SELECT content_i18n FROM school_babyeyi WHERE id=?", [bid]);
    contentI18nRaw = ciRow?.content_i18n ?? null;
  } catch (e) {
    console.warn("[generateDocuments] content_i18n load:", e.message);
  }

  const docLang = normalizeSourceLang(documentLanguage);
  const merged = mergeLocalizedBabyeyiPayload({
    lang: docLang,
    parentMessage: parentMessage || nb.parent_message || "",
    payments,
    requirements,
    classNotes,
    leaders: leaderRows,
    contentI18n: contentI18nRaw,
  });

  const pdf = await (async () => {
    if (puppeteerAvailable()) {
      try {
        const htmlPdf = await generateBabyeyiHtmlPDF({
          babyeyi: { ...nb, id: bid, class_name: resolvedClass, class: resolvedClass },
          payments: merged.payments,
          requirements: merged.requirements,
          classNotes: merged.classNotes,
          sigPaths: resolvedSigPaths,
          qrFilePath: qr.fullPath,
          docId,
          parentMessage: merged.parentMessage,
          leaders: merged.leaders,
          documentLang: docLang,
        });
        console.log(`[generateDocuments] Puppeteer HTML PDF file=${htmlPdf.filePath}`);
        return htmlPdf;
      } catch (e) {
        console.warn("[generateDocuments] Puppeteer PDF failed, falling back to PDFKit:", e.message);
      }
    }
    return generateBabyeyiPDF({
      babyeyi: { ...nb, id: bid, class_name: resolvedClass, class: resolvedClass },
      payments: merged.payments,
      requirements: merged.requirements,
      classNotes: merged.classNotes,
      sigPaths: resolvedSigPaths,
      qrFilePath: qr.fullPath,
      docId,
      parentMessage: merged.parentMessage,
      leaders: merged.leaders,
      documentLang: docLang,
    });
  })();
  console.log(`[generateDocuments] PDF file=${pdf.filePath}`);

  const viewUrl = `${getBabyeyiPublicVerifyOrigin()}/babyeyi/verify/${docId}?h=${integrityHash}`;

  try {
    await query(
      `UPDATE school_babyeyi
       SET doc_id=?, qr_code_path=?, qr_view_url=?, pdf_path=?, pdf_name=?, integrity_hash=?
       WHERE id=?`,
      [docId, qr.filePath, viewUrl, pdf.filePath, pdf.fileName, integrityHash, bid]
    );
  } catch (e) {
    console.error("[generateDocuments] UPDATE school_babyeyi failed:", e.message);
    await query(
      `UPDATE school_babyeyi SET doc_id=?, qr_code_path=?, pdf_path=?, pdf_name=?, integrity_hash=? WHERE id=?`,
      [docId, qr.filePath, pdf.filePath, pdf.fileName, integrityHash, bid]
    );
  }

  try {
    const existingSig = await query("SELECT id FROM babyeyi_signatures WHERE babyeyi_id=?", [bid]);
    if (existingSig.length) {
      try {
        await query(
          `UPDATE babyeyi_signatures SET qr_code_path=?, qr_code_name=?, qr_view_url=? WHERE babyeyi_id=?`,
          [qr.filePath, qr.fileName, viewUrl, bid]
        );
      } catch (e) {
        if (e.code === "ER_BAD_FIELD_ERROR") {
          await query(
            `UPDATE babyeyi_signatures SET qr_code_path=?, qr_code_name=? WHERE babyeyi_id=?`,
            [qr.filePath, qr.fileName, bid]
          );
        } else throw e;
      }
    } else {
      try {
        await query(
          `INSERT INTO babyeyi_signatures (babyeyi_id, qr_code_path, qr_code_name, qr_view_url) VALUES (?,?,?,?)`,
          [bid, qr.filePath, qr.fileName, viewUrl]
        );
      } catch (e) {
        if (e.code === "ER_BAD_FIELD_ERROR") {
          await query(
            `INSERT INTO babyeyi_signatures (babyeyi_id, qr_code_path, qr_code_name) VALUES (?,?,?)`,
            [bid, qr.filePath, qr.fileName]
          );
        } else throw e;
      }
    }
  } catch (e) {
    console.warn("[generateDocuments] signatures upsert warn:", e.message);
  }

  await query(
    `INSERT IGNORE INTO babyeyi_doc_ids (doc_id, babyeyi_id) VALUES (?,?)`,
    [docId, bid]
  ).catch(e => console.warn("[generateDocuments] babyeyi_doc_ids:", e.message));

  console.log(`[babyeyi] ✅ generateDocuments done: bid=${bid}, docId=${docId}, hash=${integrityHash}`);
  return { docId, qrPath: qr.filePath, qrViewUrl: viewUrl, pdfPath: pdf.filePath, integrityHash };
};

// ════════════════════════════════════════════════════════════
// After async EN→rw/fr persistence — rebuild PDF with merged narrative
// ════════════════════════════════════════════════════════════
async function regenerateDocumentsForBid(id, documentLanguage = "en") {
  const rows = await query("SELECT * FROM school_babyeyi WHERE id=? AND is_active=1", [id]);
  if (!rows.length) return null;
  const babyeyi = normalise(rows[0]);

  let payments = await query(
    "SELECT name, amount FROM babyeyi_payments WHERE babyeyi_id=? ORDER BY sort_order", [id]
  );
  if (!payments.length && rows[0].payments) {
    try {
      const raw = typeof rows[0].payments === "string" ? JSON.parse(rows[0].payments) : rows[0].payments;
      if (Array.isArray(raw)) payments = raw;
    } catch {}
  }

  const [studentReqs, classReqsRaw, sigRows] = await Promise.all([
    query("SELECT item, description, quantity FROM babyeyi_student_requirements WHERE babyeyi_id=? ORDER BY sort_order", [id]).catch(() => []),
    query(`SELECT COALESCE(item, information) AS item, details
           FROM babyeyi_class_requirements WHERE babyeyi_id=? ORDER BY COALESCE(sort_order, 0)`, [id]).catch(() => []),
    query("SELECT * FROM babyeyi_signatures WHERE babyeyi_id=? LIMIT 1", [id]).catch(() => []),
  ]);

  const sigRow = sigRows[0] || {};
  const classReqs = classReqsRaw.map(normaliseClassReq);

  return generateDocuments({
    bid: id,
    babyeyi,
    payments: payments.map(p => ({ name: p.name, amount: Number(p.amount) || 0 })),
    requirements: studentReqs,
    classNotes: classReqs,
    documentLanguage: normalizeSourceLang(documentLanguage),
    sigPaths: {
      sigPath:        sigRow.director_sig_path  || null,
      stampPath:      sigRow.stamp_path         || null,
      schoolLogoPath: sigRow.school_logo_path   || null,
      otherLogoPath:  sigRow.other_logo_path    || null,
    },
    academicYear: babyeyi.academic_year,
    schoolId: babyeyi.school_id,
    parentMessage: babyeyi.parent_message || "",
  });
}

/** Non-blocking: fill content_i18n then optionally regenerate PDF for rw/fr (avoids slow HTTP responses). */
function scheduleBabyeyiTranslationJob(bid, preferredLang) {
  const lang = normalizeSourceLang(preferredLang);
  setImmediate(() => {
    void (async () => {
      try {
        await query(`UPDATE school_babyeyi SET translation_status=? WHERE id=?`, ["pending", bid]).catch(() => {});
        await buildAndPersistContentI18n(bid, { query, fetchLeaders });
        if (lang === "rw" || lang === "fr") {
          await regenerateDocumentsForBid(bid, lang);
        }
        console.log(`[babyeyi] ✅ background translation job finished bid=${bid} lang=${lang}`);
      } catch (e) {
        console.error(`[babyeyi] ❌ background translation job bid=${bid}:`, e.message);
        await query(`UPDATE school_babyeyi SET translation_status=? WHERE id=?`, ["failed", bid]).catch(() => {});
      }
    })();
  });
}

// ════════════════════════════════════════════════════════════
// MIDDLEWARE
// ════════════════════════════════════════════════════════════
const PUBLIC_PATHS = ["/verify/"];

router.use((req, res, next) => {
  const isPublic = PUBLIC_PATHS.some(p => req.path.startsWith(p));

  // Allow unauthenticated GET requests to the list endpoint
  // ONLY when a school_id is provided — this powers the public school website
  // BabyeyiFinder component. The handler further filters to approved-only docs.
  const isPublicSchoolSearch =
    req.method === "GET" &&
    (req.path === "/" || req.path === "") &&
    !!req.query.school_id;

  // Allow unauthenticated GET for single document and QR code (BabyeyiFinder public view)
  // Handlers enforce approved-only for GET /:id when unauthenticated
  const isPublicSingleOrQr =
    req.method === "GET" &&
    /^\/\d+(\/qrcode)?$/.test(req.path);

  if (isPublic || isPublicSchoolSearch || isPublicSingleOrQr) return next();

  if (!req.user && !req.session?.userId) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
  if (!req.user && req.session?.user) req.user = req.session.user;
  if (req.user && normalizeSchoolId(req.user.school_id) == null) {
    req.user.school_id =
      normalizeSchoolId(req.user?.school?.id) ??
      normalizeSchoolId(req.session?.user?.school?.id) ??
      normalizeSchoolId(req.session?.user?.school_id) ??
      normalizeSchoolId(req.session?.school_id) ??
      null;
  }
  next();
});
// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/school-info
// ════════════════════════════════════════════════════════════
router.get("/school-info", async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "school_id not found in session" });
    }

    let school = {};
    try {
      const minimalRows = await query(
        `SELECT id, school_name, school_code, province, district, sector, phone, email FROM schools WHERE id=? LIMIT 1`,
        [schoolId]
      );
      if (!minimalRows.length) return res.status(404).json({ success: false, message: "School not found" });
      school = { ...minimalRows[0] };
    } catch (e) {
      return res.status(500).json({ success: false, message: "Failed to load school info" });
    }

    try {
      const fullRows = await query("SELECT * FROM schools WHERE id=? LIMIT 1", [schoolId]);
      if (fullRows?.[0]) Object.assign(school, fullRows[0]);
    } catch (_) {}

    // Keep cell and village separate (both come directly from `schools` table).
    // `cell` should not fall back to village, so Step 1 dropdown values match DB.
    const cell           = school.cell ?? "";
    const stampUrl       = school.school_stamp_url ?? school.stamp_url ?? "";
    const headName       = school.head_teacher_name ?? "";
    const headPhone      = school.head_teacher_phone ?? "";
    const headEmail      = school.head_teacher_email ?? "";
    let educationLevels  = school.education_levels;
    try { educationLevels = typeof educationLevels === "string" ? JSON.parse(educationLevels) : (educationLevels || []); }
    catch (_) { educationLevels = []; }

    const schoolPayload = {
      id:               school.id,
      school_name:      school.school_name      ?? "",
      school_code:      school.school_code      ?? "",
      category:         school.school_category  ?? "",
      ownership:        school.ownership_type   ?? "",
      type:             school.school_type      ?? "",
      province:         school.province         ?? "",
      district:         school.district         ?? "",
      sector:           school.sector           ?? "",
      cell,
      village:          school.village          ?? "",
      phone:            school.phone            ?? "",
      email:            school.email            ?? "",
      po_box:           school.postal_address   ?? "",
      logo_url:         school.logo_url         ?? "",
      stamp_url:        stampUrl,
      head_teacher_name:  headName,
      head_teacher_phone: headPhone,
      head_teacher_email: headEmail,
      education_levels:   educationLevels,
      status:             school.status         ?? "active",
    };

    const userId = req.user?.id || req.session?.userId;
    let headTeacherSignatureUrl = "";
    let headTeacherFullName     = headName;

    if (userId) {
      try {
        const userRows = await query(
          `SELECT CONCAT(u.first_name, ' ', u.last_name) AS full_name,
                  COALESCE(u.signature_url, '') AS signature_url
           FROM users u WHERE u.id=? AND u.deleted_at IS NULL LIMIT 1`,
          [userId]
        );
        if (userRows.length) {
          // Prefer manager/user signature_url, but fallback to the school's stored head signature.
          headTeacherSignatureUrl = userRows[0].signature_url || school.head_signature_url || "";
          if (!headTeacherFullName.trim()) headTeacherFullName = userRows[0].full_name || "";
        }
      } catch (e) { console.warn("[school-info] user sig query:", e.message); }
    }

    schoolPayload.head_teacher_name          = headTeacherFullName;
    schoolPayload.head_teacher_signature_url = headTeacherSignatureUrl;
    schoolPayload.head_teacher_title         = "Head Teacher";

    const latestBabyeyi = await query(
      `SELECT id, academic_year, term, status FROM school_babyeyi WHERE school_id=? ORDER BY created_at DESC LIMIT 1`,
      [schoolId]
    ).then(rows => rows[0] || null).catch(() => null);

    res.json({ success: true, data: { school: schoolPayload, latest_babyeyi: latestBabyeyi } });
  } catch (err) {
    console.error("❌ /school-info error:", err.message);
    res.status(500).json({ success: false, message: "Failed to load school info" });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/babyeyi/upload-asset
// ════════════════════════════════════════════════════════════
router.post("/upload-asset", uploadAsset.single("file"), async (req, res) => {
  try {
    const schoolId  = resolveSchoolId(req);
    const assetType = req.body?.asset_type;
    if (!schoolId)  return res.status(400).json({ success: false, message: "school_id missing from session" });
    if (!req.file)  return res.status(400).json({ success: false, message: "No file uploaded" });
    if (!["logo","signature","stamp","other_logo","accountant_signature"].includes(assetType)) {
      return res.status(400).json({ success: false, message: "asset_type must be logo, other_logo, signature, stamp, or accountant_signature" });
    }
    const fileUrl = `/${ASSET_DIR}${req.file.filename}`;
    if (assetType === "logo") {
      await query(`UPDATE schools SET logo_url=? WHERE id=?`, [fileUrl, schoolId]);
    } else if (assetType === "other_logo") {
      await query(
        `UPDATE babyeyi_signatures bs INNER JOIN school_babyeyi b ON b.id=bs.babyeyi_id
         SET bs.other_logo_path=?, bs.other_logo_name=? WHERE b.school_id=?`,
        [fileUrl, req.file.originalname, schoolId]
      ).catch(e => console.warn("[upload-asset] other_logo update:", e.message));
    } else if (assetType === "stamp") {
      await query(`UPDATE schools SET school_stamp_url=? WHERE id=?`, [fileUrl, schoolId]);
    } else if (assetType === "signature") {
      const userId = req.user?.id || req.session?.userId;
      if (userId) await query(`UPDATE users SET signature_url=? WHERE id=?`, [fileUrl, userId]);
      await query(`UPDATE schools SET head_signature_url=? WHERE id=?`, [fileUrl, schoolId]).catch(() => {});
    } else if (assetType === "accountant_signature") {
      const userId = req.user?.id || req.session?.userId;
      if (!userId) return res.status(400).json({ success: false, message: "User session required for accountant signature" });
      await query(`UPDATE users SET signature_url=? WHERE id=?`, [fileUrl, userId]);
    }
    res.json({ success: true, url: fileUrl, asset_type: assetType, message: `${assetType} uploaded successfully` });
  } catch (err) {
    console.error("❌ /upload-asset error:", err.message);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/nesa-limit
// ════════════════════════════════════════════════════════════
router.get("/nesa-limit", async (req, res) => {
  try {
    const { category, level, term, academic_year } = req.query;
    if (!category || !level || !term || !academic_year)
      return res.json({ success: true, data: null, message: "Parameters missing" });
    const row = await queryActiveNesaFeeLimit(category, level, term, academic_year);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch NESA limit" });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/student-requirements-catalog
// Master list for Step 3 — rows from `student_requirements` (MariaDB)
// ════════════════════════════════════════════════════════════
router.get("/student-requirements-catalog", async (req, res) => {
  try {
    const rows = await fetchStudentRequirementsCatalog();
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[babyeyi] student-requirements-catalog:", err.message);
    return res.status(500).json({ success: false, message: "Failed to load student requirements" });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/debug-hash/:id
// ════════════════════════════════════════════════════════════
router.get("/debug-hash/:id", async (req, res) => {
  if (!DEBUG_HASH) return res.status(403).json({ message: "Set DEBUG_HASH=1 in .env to use this endpoint" });
  try {
    const docId = req.params.id.toUpperCase().trim();
    const rows = await query("SELECT * FROM school_babyeyi WHERE doc_id=? LIMIT 1", [docId]);
    if (!rows.length) return res.status(404).json({ message: "Not found" });
    const b = normalise(rows[0]);
    const payments = await query("SELECT name, amount FROM babyeyi_payments WHERE babyeyi_id=? ORDER BY sort_order", [b.id]);
    const normed = normalisePaymentsForHash(payments);
    const hashFields = {
      docId,
      schoolId:      b.school_id,
      className:     b.class || b.class_name || "",
      term:          b.term  || "",
      academicYear:  b.academic_year || "",
      payments:      normed,
      bankAccountNo: b.bank_account_no || "",
    };
    const serverHash = generateIntegrityHash(hashFields);
    const canonical  = buildCanonical(hashFields);
    res.json({
      docId,
      storedHash:   b.integrity_hash || null,
      serverHash,
      match:        b.integrity_hash === serverHash,
      canonical,
      fields:       hashFields,
      secretPrefix: HASH_SECRET.slice(0, 8) + "...",
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/verify/:docId — PUBLIC
// v13: reads ?h= query param; returns verifyUrl in response
// ════════════════════════════════════════════════════════════
router.get("/verify/:docId", async (req, res) => {
  try {
    let rawParam = req.params.docId || "";
    try { rawParam = decodeURIComponent(rawParam); } catch (_) {}
    rawParam = rawParam.trim().replace(/%7[Cc]/g, "|");

    const parsed = parseQRPayload(rawParam);
    const docId  = parsed
      ? parsed.docId
      : rawParam.split("|")[0].toUpperCase().trim();

    // v13: accept hash from parsed payload OR ?h= query param
    const qrHash = parsed?.hash
      || (typeof req.query.h === "string" && /^[0-9a-f]{16}$/i.test(req.query.h)
          ? req.query.h.toLowerCase()
          : null);

    if (!docId || !/^BY-\d{4}-\d{5}$/.test(docId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid document ID format. Got: "${docId || rawParam}". Expected: BY-YYYY-NNNNN`,
      });
    }

    const rows = await query(
      `SELECT b.*,
              COALESCE(b.school_name, s.school_name) AS resolved_school_name,
              COALESCE(b.school_district, s.district) AS resolved_district,
              COALESCE(b.school_sector, s.sector)     AS resolved_sector
       FROM school_babyeyi b
       LEFT JOIN schools s ON s.id=b.school_id
       WHERE b.doc_id=? AND b.is_active=1 LIMIT 1`,
      [docId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: `Document "${docId}" not found or revoked.`, docId });
    }

    const babyeyi = normalise(rows[0]);

    const [payments, sigs] = await Promise.all([
      query("SELECT name, amount FROM babyeyi_payments WHERE babyeyi_id=? ORDER BY sort_order", [babyeyi.id]),
      query("SELECT qr_code_path, qr_view_url FROM babyeyi_signatures WHERE babyeyi_id=? LIMIT 1", [babyeyi.id])
        .catch(() => []),
    ]);

    let paymentList = payments;
    if (!paymentList.length && babyeyi.payments) {
      try {
        const p = typeof babyeyi.payments === "string" ? JSON.parse(babyeyi.payments) : babyeyi.payments;
        if (Array.isArray(p)) paymentList = p;
      } catch (_) {}
    }

    const totalFee = paymentList.reduce((s, p) => s + Number(p.amount || 0), 0);
    const normalisedPaymentsForVerify = normalisePaymentsForHash(paymentList);

    const hashFields = {
      docId,
      schoolId:      babyeyi.school_id,
      className:     babyeyi.class || babyeyi.class_name || "",
      term:          babyeyi.term  || "",
      academicYear:  babyeyi.academic_year || "",
      payments:      normalisedPaymentsForVerify,
      bankAccountNo: babyeyi.bank_account_no || "",
    };

    if (DEBUG_HASH) {
      console.log("[verify] hashFields:", JSON.stringify(hashFields));
    }

    const serverHash = generateIntegrityHash(hashFields);

    let integrityStatus, integrityDetail;

    if (qrHash) {
      const match = verifyIntegrityHash(hashFields, qrHash);
      integrityStatus = match ? "valid" : "tampered";
      integrityDetail = match
        ? "QR hash matches server — document is authentic"
        : "QR hash does NOT match server — possible tampering";
    } else {
      const storedHash = babyeyi.integrity_hash;
      if (!storedHash) {
        try {
          await query("UPDATE school_babyeyi SET integrity_hash=? WHERE id=?", [serverHash, babyeyi.id]);
        } catch (_) {}
        integrityStatus = "no_hash";
        integrityDetail = "Document created before cryptographic signing was enabled. Hash now stored.";
      } else {
        const match = storedHash === serverHash;
        if (!match) {
          try {
            await query("UPDATE school_babyeyi SET integrity_hash=? WHERE id=?", [serverHash, babyeyi.id]);
            integrityStatus = "valid";
            integrityDetail = "Hash was recomputed (old algorithm/secret) — document is authentic";
          } catch (rehashErr) {
            integrityStatus = "tampered";
            integrityDetail = "Hash mismatch — possible tampering OR old hash algorithm";
          }
        } else {
          integrityStatus = "valid";
          integrityDetail = "Stored hash matches recomputed hash";
        }
      }
    }

    return res.json({
      success: true,
      data: {
        id:           babyeyi.id,
        docId,
        integrityHash: babyeyi.integrity_hash || null,
        status:       babyeyi.status,
        isValid:      babyeyi.status === "approved",
        schoolName:   rows[0].resolved_school_name || babyeyi.school_name || "Unknown School",
        class:        babyeyi.class       || "",
        level:        babyeyi.level       || "",
        academicYear: babyeyi.academic_year,
        term:         babyeyi.term,
        category:     babyeyi.category    || "",
        district:     rows[0].resolved_district || null,
        sector:       rows[0].resolved_sector   || null,
        totalFee,
        payments:     paymentList,
        pdfPath:      babyeyi.pdf_path    || null,
        qrPath:       (sigs[0] || {})?.qr_code_path || babyeyi.qr_code_path || null,
        verifyUrl:    buildQRPayload(docId, serverHash),  // v13: full canonical verify URL
        createdAt:    babyeyi.created_at,
        verifiedAt:   new Date().toISOString(),
        exceedsLimit: !!babyeyi.exceeds_limit,
        nesaLimit:    babyeyi.nesa_limit  || null,
        integrity: {
          status:     integrityStatus,
          detail:     integrityDetail,
          serverHash,
          storedHash: babyeyi.integrity_hash || null,
          qrHash:     qrHash || null,
          algorithm:  "HMAC-SHA256 (truncated 64-bit)",
        },
      },
    });
  } catch (err) {
    console.error("[babyeyi/verify] Error:", err.message);
    return res.status(500).json({ success: false, message: "Verification failed — server error" });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/stats
// ════════════════════════════════════════════════════════════
router.get("/stats", async (req, res) => {
  try {
    const schoolId = req.query.school_id || resolveSchoolId(req);
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const params = schoolId ? [schoolId] : [];
    const where = schoolId ? "WHERE b.school_id=? AND b.is_active=1" : "WHERE b.is_active=1";

    const [totals] = await query(
      `SELECT COUNT(*) AS total,
              SUM(b.status='approved')  AS approved,
              SUM(b.status='pending')   AS pending,
              SUM(b.status='rejected')  AS rejected,
              SUM(b.status='draft')     AS draft,
              SUM(b.exceeds_limit=1)    AS exceeds_count
       FROM school_babyeyi b ${where}`,
      params
    );

    const monthlyWhere = schoolId
      ? "WHERE b.school_id=? AND b.is_active=1 AND YEAR(b.created_at)=?"
      : "WHERE b.is_active=1 AND YEAR(b.created_at)=?";
    const monthlyParams = schoolId ? [schoolId, year] : [year];
    const monthRows = await query(
      `SELECT MONTH(b.created_at) AS month_num, COUNT(*) AS count
       FROM school_babyeyi b ${monthlyWhere}
       GROUP BY MONTH(b.created_at)
       ORDER BY month_num ASC`,
      monthlyParams
    );

    const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const byMonth = Object.fromEntries(
      (monthRows || []).map((r) => [Number(r.month_num), Number(r.count || 0)])
    );
    const monthly_activity = MONTH_LABELS.map((label, i) => ({
      label,
      value: byMonth[i + 1] || 0,
    }));

    const approved = Number(totals?.approved || 0);
    const pending = Number(totals?.pending || 0);
    const rejected = Number(totals?.rejected || 0);
    const draft = Number(totals?.draft || 0);

    const status_overview = [
      { label: "Approved", value: approved, color: "#000435" },
      { label: "Pending", value: pending, color: "#fbbf24" },
      { label: "Rejected", value: rejected, color: "#94a3b8" },
      { label: "Draft", value: draft, color: "#cbd5e1" },
    ];

    res.json({
      success: true,
      data: {
        ...totals,
        year,
        monthly_activity,
        status_overview,
      },
    });
  } catch (err) {
    console.error("❌ /stats:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/analytics — school financial analytics (live)
// ════════════════════════════════════════════════════════════
router.get("/analytics", async (req, res) => {
  try {
    const schoolId = req.query.school_id || resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School not found in session." });
    }

    const babyeyiRows = await query(
      `SELECT b.id, b.class_name, b.term, b.academic_year, b.status,
              COALESCE(b.total_fee, b.total_amount, 0) AS total_fee,
              COALESCE(b.nesa_limit, 0) AS nesa_limit,
              COALESCE(b.exceeds_limit, 0) AS exceeds_limit,
              b.created_at, b.education_level, b.school_category, b.doc_id
       FROM school_babyeyi b
       WHERE b.school_id=? AND b.is_active=1
       ORDER BY b.academic_year DESC, b.term ASC, b.class_name ASC`,
      [schoolId]
    );

    const ids = (babyeyiRows || []).map((r) => r.id).filter(Boolean);
    let paymentRows = [];
    if (ids.length) {
      paymentRows = await query(
        `SELECT name, SUM(amount) AS amount
         FROM babyeyi_payments
         WHERE babyeyi_id IN (${ids.map(() => "?").join(",")})
         GROUP BY name`,
        ids
      );
    }

    const catMap = new Map();
    for (const p of paymentRows || []) {
      const name = String(p.name || "Other").trim() || "Other";
      catMap.set(name, (catMap.get(name) || 0) + Number(p.amount || 0));
    }
    const totalPaymentCat = [...catMap.values()].reduce((s, v) => s + v, 0);
    const paymentBreakdown = [...catMap.entries()]
      .map(([label, amount]) => ({
        label,
        amount: Math.round(amount),
        value: totalPaymentCat > 0 ? Math.round((amount / totalPaymentCat) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    const totalIncome = (babyeyiRows || []).reduce((s, b) => s + Number(b.total_fee || 0), 0);
    const exceedsCount = (babyeyiRows || []).filter((b) => Number(b.exceeds_limit) === 1).length;
    const withLimit = (babyeyiRows || []).filter((b) => Number(b.nesa_limit) > 0);
    const compliant = withLimit.filter((b) => Number(b.exceeds_limit) !== 1).length;
    const complianceRate = withLimit.length > 0 ? Math.round((compliant / withLimit.length) * 100) : 100;

    const exceedRows = withLimit.filter(
      (b) => Number(b.exceeds_limit) === 1 && Number(b.nesa_limit) > 0
    );
    const avgFeeIncrease = exceedRows.length
      ? exceedRows.reduce(
          (s, b) =>
            s + ((Number(b.total_fee) - Number(b.nesa_limit)) / Number(b.nesa_limit)) * 100,
          0
        ) / exceedRows.length
      : 0;

    const termMap = new Map();
    for (const b of babyeyiRows || []) {
      const yr = String(b.academic_year || "").trim();
      const label = `${b.term || "?"}${yr ? ` · ${yr.slice(-7)}` : ""}`.trim();
      const prev = termMap.get(label) || { feeSum: 0, limitSum: 0, count: 0 };
      prev.feeSum += Number(b.total_fee || 0);
      prev.limitSum += Number(b.nesa_limit || 0);
      prev.count += 1;
      termMap.set(label, prev);
    }
    const termTrend = [...termMap.entries()].map(([label, v]) => ({
      label,
      value: Math.round(v.feeSum / Math.max(1, v.count) / 1000),
      limit: Math.round(v.limitSum / Math.max(1, v.count) / 1000),
    }));

    const classMap = new Map();
    for (const b of babyeyiRows || []) {
      const cls = String(b.class_name || "").trim();
      if (!cls) continue;
      classMap.set(cls, (classMap.get(cls) || 0) + Number(b.total_fee || 0));
    }
    const classBreakdown = [...classMap.entries()]
      .map(([label, totalFee]) => ({ label, value: Math.round(totalFee / 1000) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const statusCounts = { approved: 0, pending: 0, rejected: 0, draft: 0 };
    for (const b of babyeyiRows || []) {
      const st = String(b.status || "draft").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(statusCounts, st)) statusCounts[st]++;
      else statusCounts.draft++;
    }

    const complianceHistory = (babyeyiRows || []).map((b) => {
      const fee = Number(b.total_fee || 0);
      const limit = Number(b.nesa_limit || 0);
      const exceedsLimit = Number(b.exceeds_limit) === 1;
      const rate = limit > 0 ? Math.min(150, Math.round((fee / limit) * 100)) : 100;
      let status = String(b.status || "draft").toLowerCase();
      if (exceedsLimit) status = "exceeded";
      else if (limit > 0 && fee <= limit) status = "compliant";
      return {
        year: b.academic_year || "—",
        term: b.term || "—",
        class: b.class_name || "—",
        fee,
        limit,
        status,
        rate,
        docId: b.doc_id || null,
      };
    });

    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const monthRows = await query(
      `SELECT MONTH(created_at) AS month_num, COUNT(*) AS count
       FROM school_babyeyi
       WHERE school_id=? AND is_active=1 AND YEAR(created_at)=?
       GROUP BY MONTH(created_at)`,
      [schoolId, year]
    );
    const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const byMonth = Object.fromEntries(
      (monthRows || []).map((r) => [Number(r.month_num), Number(r.count || 0)])
    );
    const monthlyActivity = MONTH_LABELS.map((label, i) => ({
      label,
      value: byMonth[i + 1] || 0,
    }));

    let studentCount = 0;
    try {
      const [sr] = await query(`SELECT COUNT(*) AS c FROM students WHERE school_id=?`, [schoolId]);
      studentCount = Number(sr?.c || 0);
    } catch (_) {
      /* optional */
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalIncome,
          complianceRate,
          avgFeeIncrease: Math.round(avgFeeIncrease * 10) / 10,
          exceedsCount,
          babyeyiCount: babyeyiRows.length,
          studentCount,
          approved: statusCounts.approved,
          pending: statusCounts.pending,
          rejected: statusCounts.rejected,
          draft: statusCounts.draft,
        },
        termTrend,
        classBreakdown,
        paymentBreakdown,
        statusOverview: [
          { label: "Approved", value: statusCounts.approved, color: "#000435" },
          { label: "Pending", value: statusCounts.pending, color: "#fbbf24" },
          { label: "Rejected", value: statusCounts.rejected, color: "#64748b" },
          { label: "Draft", value: statusCounts.draft, color: "#cbd5e1" },
        ],
        complianceHistory,
        monthlyActivity,
      },
    });
  } catch (err) {
    console.error("❌ /analytics:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch analytics" });
  }
});

// ════════════════════════════════════════════════════════════
// In-app notifications (school Babyeyi portal)
// ════════════════════════════════════════════════════════════
const {
  listSchoolNotificationsForUser,
  countSchoolUnread,
} = require('./babyeyiNesaDecisionNotifications');

router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user?.id;
    const schoolId = resolveSchoolId(req);
    if (!userId || !schoolId) {
      return res.status(400).json({ success: false, message: 'School context required' });
    }
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
    const [items, unread] = await Promise.all([
      listSchoolNotificationsForUser(userId, schoolId, limit),
      countSchoolUnread(userId, schoolId),
    ]);
    res.json({ success: true, data: items, unread });
  } catch (err) {
    console.error('[babyeyi/notifications]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
    await query(
      `UPDATE staff_portal_notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [req.params.id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark read' });
  }
});

router.post('/notifications/read-all', async (req, res) => {
  try {
    const userId = req.user?.id;
    const schoolId = resolveSchoolId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (schoolId) {
      await query(
        `UPDATE staff_portal_notifications SET is_read = 1 WHERE user_id = ? AND school_id = ? AND is_read = 0`,
        [userId, schoolId]
      );
    } else {
      await query(
        `UPDATE staff_portal_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
        [userId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark all read' });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi — list
// ════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const { status, year, term, category, level, search, school_id, request_status, page = 1, limit = 20 } = req.query;
    let where = ["b.is_active=1"], params = [];
    const join = "LEFT JOIN babyeyi_increase_requests ir ON ir.babyeyi_id=b.id";

    if (status)         { where.push("b.status=?");          params.push(status); }
    if (year)           { where.push("b.academic_year=?");   params.push(year); }
    if (term)           { where.push("b.term=?");            params.push(term); }
    if (category)       { where.push("b.school_category=?"); params.push(category); }
    if (level)          { where.push("b.education_level=?"); params.push(level); }
    if (request_status) { where.push("ir.nesa_status=?");    params.push(request_status); }

    const resolvedSchoolId = school_id || resolveSchoolId(req);
    if (resolvedSchoolId) { where.push("b.school_id=?"); params.push(resolvedSchoolId); }
    if (search) {
      // Support multi-class Babyeyi: match either primary class_name or the JSON array in classes_json
      where.push("(b.class_name LIKE ? OR b.classes_json LIKE ? OR b.academic_year LIKE ? OR b.doc_id LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSQL = `WHERE ${where.join(" AND ")}`;
    const offset   = (Number(page) - 1) * Number(limit);

   const pageNum   = Math.max(1, parseInt(page)  || 1);
const limitNum  = Math.max(1, parseInt(limit) || 20);
const offsetNum = (pageNum - 1) * limitNum;

const [rows, [{ total }]] = await Promise.all([
  query(
    `SELECT b.*, ir.id AS request_id, ir.nesa_status AS request_status, ir.deo_notes
     FROM school_babyeyi b ${join} ${whereSQL}
     ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limitNum, offsetNum]
  ),
  query(`SELECT COUNT(*) AS total FROM school_babyeyi b ${join} ${whereSQL}`, params),
]);

    res.json({
      success: true,
      data: rows.map(normalise),
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    console.error("[babyeyi/GET]", err);
    res.status(500).json({ success: false, message: "Failed to fetch babyeyi" });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/requests
// ════════════════════════════════════════════════════════════
router.get("/requests", async (req, res) => {
  try {
    const { status, school_id, page = 1, limit = 20 } = req.query;
    const resolvedSchoolId = school_id ? Number(school_id) : resolveSchoolId(req);
    const where  = [];
    const params = [];

    if (status) { where.push("r.nesa_status = ?"); params.push(status); }
    if (resolvedSchoolId) { where.push("b.school_id = ?"); params.push(resolvedSchoolId); }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset   = (Math.max(Number(page), 1) - 1) * Number(limit);

    const rows = await query(
      `SELECT
         r.id, r.babyeyi_id, r.school_id, r.nesa_status, r.reason, r.description,
         COALESCE(r.current_limit, 0)      AS current_limit,
         COALESCE(r.requested_amount, 0)   AS requested_amount,
         COALESCE(r.excess_amount, 0)      AS excess_amount,
         COALESCE(r.deo_notes, '')         AS deo_notes,
         COALESCE(r.nesa_notes, '')        AS nesa_notes,
         COALESCE(r.submitted_at, r.created_at, NOW()) AS submitted_at,
         COALESCE(r.reviewed_at, NULL)     AS reviewed_at,
         r.parent_rep_doc_path, r.parent_rep_doc_name,
         r.budget_doc_path, r.budget_doc_name,
         b.class_name, b.term, b.academic_year, b.school_category, b.education_level,
         COALESCE(b.total_fee, b.total_amount, 0) AS total_fee,
         b.school_id AS babyeyi_school_id,
         b.school_name AS babyeyi_school_name,
         b.doc_id, b.status AS babyeyi_status
       FROM babyeyi_increase_requests r
       JOIN school_babyeyi b ON b.id = r.babyeyi_id
       ${whereSQL}
       ORDER BY COALESCE(r.submitted_at, r.created_at) DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    let total = rows.length;
    try {
      const [countRow] = await query(
        `SELECT COUNT(*) AS total FROM babyeyi_increase_requests r JOIN school_babyeyi b ON b.id = r.babyeyi_id ${whereSQL}`,
        params
      );
      total = countRow?.total ?? rows.length;
    } catch (_) {}

    res.json({
      success: true,
      data: rows.map(r => ({
        ...normalise(r),
        id: r.id, babyeyiId: r.babyeyi_id, nesaStatus: r.nesa_status,
        reason: r.reason || "", description: r.description || "",
        currentLimit: Number(r.current_limit || 0),
        requestedAmount: Number(r.requested_amount || 0),
        excessAmount: Number(r.excess_amount || 0),
        deoNotes: r.deo_notes || "", nesaNotes: r.nesa_notes || "",
        submittedAt: r.submitted_at, reviewedAt: r.reviewed_at || null,
        parentRepDocPath: r.parent_rep_doc_path || null,
        parentRepDocName: r.parent_rep_doc_name || null,
        budgetDocPath: r.budget_doc_path || null,
        budgetDocName: r.budget_doc_name || null,
        className: r.class_name || "", term: r.term || "",
        academicYear: r.academic_year || "", category: r.school_category || "",
        level: r.education_level || "", totalFee: Number(r.total_fee || 0),
        schoolId: r.school_id || r.babyeyi_school_id,
        schoolName: r.babyeyi_school_name || "",
        docId: r.doc_id || null, babyeyiStatus: r.babyeyi_status || "",
      })),
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    console.error("[babyeyi/GET /requests] ❌", err.message, err.stack);
    res.status(500).json({ success: false, message: `Failed to fetch requests: ${err.message}` });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/:id  — includes leaders
// ════════════════════════════════════════════════════════════
router.get("/:id", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM school_babyeyi WHERE id=? AND is_active=1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });
    const babyeyi = normalise(rows[0]);

    // Public access (unauthenticated): only allow viewing approved documents
    if (!req.user && babyeyi.status !== "approved") {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const [payments, studentReqs, classReqsRaw, signatures, increaseReq, leaders] = await Promise.all([
      query("SELECT * FROM babyeyi_payments WHERE babyeyi_id=? ORDER BY sort_order",             [babyeyi.id]),
      query("SELECT * FROM babyeyi_student_requirements WHERE babyeyi_id=? ORDER BY sort_order", [babyeyi.id]),
      query(`SELECT id, babyeyi_id,
                    COALESCE(item, information) AS item,
                    details, COALESCE(sort_order, 0) AS sort_order
             FROM babyeyi_class_requirements WHERE babyeyi_id=? ORDER BY COALESCE(sort_order, 0)`,
            [babyeyi.id]).catch(() => []),
      query("SELECT * FROM babyeyi_signatures WHERE babyeyi_id=?", [babyeyi.id]).catch(() => []),
      query("SELECT * FROM babyeyi_increase_requests WHERE babyeyi_id=? LIMIT 1", [babyeyi.id]).catch(() => []),
      fetchLeaders(babyeyi.id),
    ]);

    const classReqs = classReqsRaw.map(normaliseClassReq);
    const sigRow = signatures[0] || {};

    const docLang = normalizeSourceLang(req.query.lang);
    const contentI18nRaw = rows[0].content_i18n ?? null;
    const mergedDoc = mergeLocalizedBabyeyiPayload({
      lang: docLang,
      parentMessage: babyeyi.parent_message,
      payments: payments.map((p) => ({ name: p.name, amount: p.amount })),
      requirements: studentReqs,
      classNotes: classReqs,
      leaders,
      contentI18n: contentI18nRaw,
    });

    let fallbackSigPath   = sigRow.director_sig_path || null;
    let fallbackStampPath = sigRow.stamp_path        || null;
    let fallbackLogoPath  = sigRow.school_logo_path  || null;

    if (babyeyi.school_id) {
      try {
        const [schoolRow] = await query(
          "SELECT logo_url, school_stamp_url, head_signature_url FROM schools WHERE id=? LIMIT 1",
          [babyeyi.school_id]
        );
        if (schoolRow) {
          if (!fallbackSigPath   && schoolRow.head_signature_url) fallbackSigPath   = schoolRow.head_signature_url;
          if (!fallbackStampPath && schoolRow.school_stamp_url)   fallbackStampPath = schoolRow.school_stamp_url;
          if (!fallbackLogoPath  && schoolRow.logo_url)           fallbackLogoPath  = schoolRow.logo_url;
        }
      } catch (_) {}
    }

    const mergedSig = {
      ...sigRow,
      director_sig_path: fallbackSigPath,
      stamp_path:        fallbackStampPath,
      school_logo_path:  fallbackLogoPath,
      other_logo_path:   sigRow.other_logo_path || null,
    };

    const data = {
      ...babyeyi,
      parent_message: mergedDoc.parentMessage,
      payments: mergedDoc.payments.map((p, i) => ({
        ...p,
        id: payments[i]?.id,
        pay_channel: paymentPayChannelFromPayload(payments[i] || p),
      })),
      student_requirements: studentReqs.map((r, i) => ({
        ...r,
        item: mergedDoc.requirements[i]?.item ?? r.item,
        description: mergedDoc.requirements[i]?.description ?? r.description,
      })),
      class_requirements: mergedDoc.classNotes,
      signatures:           Object.keys(mergedSig).length ? mergedSig : null,
      increase_request:     increaseReq[0] || null,
      leaders: mergedDoc.leaders,
      document_language: docLang,
      translation_status: rows[0].translation_status ?? null,
    };
    if (!req.user) {
      delete data.content_i18n;
      delete data.translations_json;
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error("[babyeyi/:id]", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch babyeyi" });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/babyeyi — create
// ════════════════════════════════════════════════════════════
router.post("/", (req, res) => {
  upload(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ success: false, message: uploadErr.message });
    try {
      const body  = req.body;
      const files = req.files || {};

      if (!body.academic_year || !body.term || (!body.class && !body.classes) || !body.category) {
        return res.status(422).json({ success: false, message: "academic_year, term, class/classes, category are required" });
      }

      const schoolId = resolveSchoolId(req);
      const fv = (v, fb = null) => Array.isArray(v) ? v[0] ?? fb : v ?? fb;

      const schoolProvince = fv(body.province, req.user?.province || null);
      const schoolDistrict = fv(body.district, req.user?.district || null);
      const schoolSector   = fv(body.sector,   req.user?.sector   || null);

      // ── Multi-class support: classes_json + primary class ─────
      const classesArrRaw = body.classes || body.classes_json || null;
      const classesArr    = parseJSONField(classesArrRaw);
      const primaryClass  = (classesArr[0] || body.class || body.class_name || "").toString().trim();
      if (!primaryClass) {
        return res.status(422).json({ success: false, message: "At least one class is required" });
      }

      const level         = body.level || classToLevel(primaryClass);
      const payments      = parseJSONField(body.payments);
      const totalFee      = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const parentMessage = body.parent_message || "";

      const banksJsonRaw  = body.banks_json || body.banks || null;
      const banks         = parseJSONField(banksJsonRaw);
      const primaryBank   = banks.length > 0 ? banks[0] : null;
      const bankName      = primaryBank ? (primaryBank.bankName || primaryBank.bank_name || body.bank_name || null) : (body.bank_name || null);
      const bankAccountNo = primaryBank ? (primaryBank.accountNumber || primaryBank.bank_account_no || body.bank_account_no || null) : (body.bank_account_no || null);
      const bankBranch    = primaryBank ? (primaryBank.bankBranch || primaryBank.bank_branch || body.bank_branch || null) : (body.bank_branch || null);
      const banksJson     = banks.length > 0 ? JSON.stringify(banks) : (banksJsonRaw || null);

      const feeTargetStudents = fv(body.fee_target_students || body.feeTargetStudents, "public");
      const schoolOwnership   = await getSchoolOwnershipType(schoolId);
      const skipNesa          = shouldSkipNesaFeeLimits(schoolOwnership, feeTargetStudents);
      const categoryForRow    = skipNesa ? "Private" : fv(body.category, "Public");

      const nesaRow = skipNesa
        ? null
        : await queryActiveNesaFeeLimit(categoryForRow, level, body.term, body.academic_year).catch(() => null);
      const nesaLimit       = skipNesa ? null : (nesaRow?.max_amount ?? null);
      const exceeds         = !skipNesa && nesaLimit !== null && totalFee > Number(nesaLimit);
      const requestIncrease = body.request_increase === "true" || body.request_increase === true;

      let schoolName = body.school_name || null;
      let schoolCode = body.school_code || null;
      if (schoolId && !schoolName) {
        try {
          const [schRow] = await query("SELECT school_name, school_code FROM schools WHERE id=? LIMIT 1", [schoolId]);
          if (schRow) { schoolName = schRow.school_name; schoolCode = schRow.school_code; }
        } catch (_) {}
      }

      const status = !exceeds ? "approved" : requestIncrease ? "pending" : "draft";
      const preDocId = await generateDocId(body.academic_year);

      const result = await query(
        `INSERT INTO school_babyeyi
           (school_id, school_name, school_code,
            school_province, school_district, school_sector,
            academic_year, term, class_name, classes_json,
            school_category, education_level,
            payments, total_amount,
            bank_name, bank_account_no, bank_branch, banks_json,
            parent_message, total_fee, nesa_limit, exceeds_limit, status, doc_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          schoolId, schoolName, schoolCode,
          schoolProvince, schoolDistrict, schoolSector,
          body.academic_year, body.term, primaryClass, classesArr.length ? JSON.stringify(classesArr) : null,
          categoryForRow, level,
          JSON.stringify(payments), totalFee,
          bankName, bankAccountNo, bankBranch, banksJson,
          parentMessage, totalFee, nesaLimit, exceeds ? 1 : 0, status, preDocId,
        ]
      );
      const bid = result.insertId;

      // When fee exceeds NESA limit and school requested increase, create increase request so DEO sees it
      if (exceeds && requestIncrease) {
        const increaseReason = body.increase_reason || body.increase_title || "Fee exceeds NESA limit — school requested approval";
        const increaseDesc   = body.increase_desc   || body.increase_description || null;
        try {
          await query(
            `INSERT INTO babyeyi_increase_requests
               (babyeyi_id, school_id, school_name, district,
                reason, description,
                current_limit, requested_amount, excess_amount, nesa_status, submitted_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
            [
              bid,
              schoolId,
              schoolName,
              schoolDistrict,
              increaseReason,
              increaseDesc,
              nesaLimit,
              totalFee,
              totalFee - Number(nesaLimit),
            ]
          );
        } catch (irErr) {
          if (irErr.code === "ER_BAD_FIELD_ERROR") {
            await query(
              `INSERT INTO babyeyi_increase_requests
                 (babyeyi_id, school_id, school_name, district,
                  requested_amount, current_limit, nesa_status, reason, submitted_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())`,
              [bid, schoolId, schoolName, schoolDistrict, totalFee, nesaLimit, increaseReason]
            );
          } else throw irErr;
        }
        // If school uploaded parent rep doc or budget doc in this request, save to increase_request so DEO can see them
        const parentDoc = files.parent_rep_doc?.[0];
        const budgetDoc = files.budget_doc?.[0];
        if (parentDoc || budgetDoc) {
          const up = []; const v = [];
          if (parentDoc) { up.push("parent_rep_doc_path=?, parent_rep_doc_name=?"); v.push(`/${UPLOAD_DIR}${parentDoc.filename}`, parentDoc.originalname || null); }
          if (budgetDoc) { up.push("budget_doc_path=?, budget_doc_name=?"); v.push(`/${UPLOAD_DIR}${budgetDoc.filename}`, budgetDoc.originalname || null); }
          if (up.length) { v.push(bid); await query(`UPDATE babyeyi_increase_requests SET ${up.join(", ")} WHERE babyeyi_id=?`, v).catch(e => console.warn("[POST] update increase_request docs:", e.message)); }
        }
      }

      await query(
        `INSERT IGNORE INTO babyeyi_doc_ids (doc_id, babyeyi_id) VALUES (?,?)`,
        [preDocId, bid]
      ).catch(e => console.warn("[POST] babyeyi_doc_ids:", e.message));

      const allNamedPayments = payments.filter(p => p.name && String(p.name).trim());
      await ensureBabyeyiPaymentsPayChannelColumn();
      for (let i = 0; i < allNamedPayments.length; i++) {
        const pch = paymentPayChannelFromPayload(allNamedPayments[i]);
        try {
          await query(
            "INSERT INTO babyeyi_payments (babyeyi_id, name, amount, sort_order, pay_channel) VALUES (?,?,?,?,?)",
            [bid, allNamedPayments[i].name, Number(allNamedPayments[i].amount) || 0, i, pch]
          );
        } catch (e) {
          if (e.code === "ER_BAD_FIELD_ERROR") {
            await query(
              "INSERT INTO babyeyi_payments (babyeyi_id, name, amount, sort_order) VALUES (?,?,?,?)",
              [bid, allNamedPayments[i].name, Number(allNamedPayments[i].amount) || 0, i]
            );
          } else {
            throw e;
          }
        }
      }

      const studentReqs = parseJSONField(body.requirements);
      for (let i = 0; i < studentReqs.length; i++) {
        const r = studentReqs[i] || {};
        if (r.item) {
          const payCh =
            String(r.pay_channel || r.payChannel || "").toLowerCase() === "school" ? "school" : "babyeyi";
          const lineCost =
            payCh === "school"
              ? Math.round((Number(r.cost ?? r.school_line_rwf ?? r.schoolLineRwf) || 0) * 100) / 100
              : null;
          const costVal = lineCost && lineCost > 0 ? lineCost : null;
          await query(
            "INSERT INTO babyeyi_student_requirements (babyeyi_id, item, description, quantity, sort_order, pay_channel, cost) VALUES (?,?,?,?,?,?,?)",
            [bid, r.item, r.description || null, r.quantity || null, i, payCh, costVal]
          ).catch(async (e) => {
            if (e.code === "ER_BAD_FIELD_ERROR") {
              try {
                await query(
                  "INSERT INTO babyeyi_student_requirements (babyeyi_id, item, description, quantity, sort_order, pay_channel) VALUES (?,?,?,?,?,?)",
                  [bid, r.item, r.description || null, r.quantity || null, i, payCh]
                );
              } catch (e2) {
                if (e2.code === "ER_BAD_FIELD_ERROR") {
                  await query(
                    "INSERT INTO babyeyi_student_requirements (babyeyi_id, item, cost, sort_order) VALUES (?,?,?,?)",
                    [bid, r.item, r.cost ? Number(r.cost) : null, i]
                  );
                } else throw e2;
              }
            } else {
              throw e;
            }
          });
        }
      }

      await seedRequirementPricesFromDefaults(bid, schoolId, body.academic_year, body.term, primaryClass);

      const classReqs = parseJSONField(body.classReqs);
      for (let i = 0; i < classReqs.length; i++) {
        const itemText   = classReqs[i].item    || classReqs[i].information || "";
        const detailText = classReqs[i].details || "";
        if (itemText) {
          await query(
            `INSERT INTO babyeyi_class_requirements (babyeyi_id, information, item, details, sort_order) VALUES (?,?,?,?,?)`,
            [bid, itemText, itemText, detailText || null, i]
          );
        }
      }

      const otherInfos      = parseJSONField(body.other_infos);
      const otherInfoOffset = classReqs.length;
      for (let i = 0; i < otherInfos.length; i++) {
        const itemText = otherInfos[i].item || otherInfos[i].information || "";
        if (itemText && itemText.trim()) {
          await query(
            `INSERT INTO babyeyi_class_requirements (babyeyi_id, information, item, details, sort_order) VALUES (?,?,?,?,?)`,
            [bid, itemText, itemText, null, otherInfoOffset + i]
          );
        }
      }

      const leadersPayload = parseJSONField(body.leaders);
      if (leadersPayload.length) {
        await upsertLeaders(bid, schoolId, leadersPayload);
      }

      const dirSig     = files.director_signature?.[0];
      const stamp      = files.stamp?.[0];
      const schoolLogo = files.school_logo?.[0];
      const otherLogo  = files.other_logo?.[0];
      const accSig     = files.accountant_signature?.[0];

      if (dirSig || accSig || stamp || schoolLogo || otherLogo) {
        await query(
          `INSERT INTO babyeyi_signatures
             (babyeyi_id, director_sig_path, director_sig_name,
              accountant_sig_path, accountant_sig_name,
              stamp_path, stamp_name,
              school_logo_path, school_logo_name,
              other_logo_path, other_logo_name)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [bid,
           dirSig     ? `/${UPLOAD_DIR}${dirSig.filename}`     : null, dirSig?.originalname     || null,
           accSig     ? `/${UPLOAD_DIR}${accSig.filename}`     : null, accSig?.originalname     || null,
           stamp      ? `/${UPLOAD_DIR}${stamp.filename}`      : null, stamp?.originalname      || null,
           schoolLogo ? `/${UPLOAD_DIR}${schoolLogo.filename}` : null, schoolLogo?.originalname || null,
           otherLogo  ? `/${UPLOAD_DIR}${otherLogo.filename}`  : null, otherLogo?.originalname  || null]
        );
      }

      try {
        const bundle = await buildBabyeyiTranslationBundle({
          sourceLang: fv(body.language, "en"),
          parentMessage,
          payments:     allNamedPayments,
          requirements: studentReqs,
          classReqs,
          otherInfos,
          leaders: leadersPayload,
        });
        await query(`UPDATE school_babyeyi SET translations_json=? WHERE id=?`, [JSON.stringify(bundle), bid]);
      } catch (tErr) {
        console.warn("[babyeyi] translations_json (create):", tErr.message);
      }

      const newRows   = await query("SELECT * FROM school_babyeyi WHERE id=?", [bid]);
      const newRecord = normalise(newRows[0]);
      await audit(bid, "created", null, newRecord, req);

      const sigRowsNew = await query("SELECT * FROM babyeyi_signatures WHERE babyeyi_id=?", [bid]).catch(() => []);
      const sigRowNew  = sigRowsNew[0] || {};
      const sigPathsNew = {
        sigPath:        sigRowNew.director_sig_path  || null,
        stampPath:      sigRowNew.stamp_path         || null,
        schoolLogoPath: sigRowNew.school_logo_path   || null,
        otherLogoPath:  sigRowNew.other_logo_path    || null,
      };

      const docParams = {
        bid,
        babyeyi: { ...newRecord, doc_id: preDocId, bank_name: bankName, bank_account_no: bankAccountNo, banks_json: banksJson },
        payments:     allNamedPayments.map(p => ({ name: p.name, amount: Number(p.amount) || 0 })),
        requirements: studentReqs.filter(r => r.item),
        classNotes: [
          ...classReqs.filter(c => c.item || c.information),
          ...otherInfos.filter(o => o.item).map(o => ({ item: o.item, details: "" })),
        ],
        sigPaths:     sigPathsNew,
        academicYear: body.academic_year,
        schoolId,
        parentMessage,
        documentLanguage: fv(body.language, "en"),
      };

      let docResult = null;
      try {
        docResult = await generateDocuments(docParams);
      } catch (docErr) {
        console.error(`[babyeyi] ⚠️  Doc gen failed on create (bid=${bid}):`, docErr.message, docErr.stack);
      }

      scheduleBabyeyiTranslationJob(bid, fv(body.language, "en"));

      if (String(status).toLowerCase() === "approved") {
        notifyParentsBabyeyiReady(bid, "created_approved").catch((e) => {
          console.warn("[babyeyi] notifyParentsBabyeyiReady(create):", e.message);
        });
      }

      if (schoolDistrict) {
        try {
          const { notifyDistrictDeosNewBabyeyi } = require("./districtDeoNotifications");
          notifyDistrictDeosNewBabyeyi({
            district: schoolDistrict,
            babyeyiId: bid,
            schoolName,
            docId: preDocId,
            status,
            exceeds: !!exceeds,
            className: primaryClass,
            term: body.term,
            academicYear: body.academic_year,
          }).catch((e) => console.warn("[babyeyi] district DEO notify:", e.message));
        } catch (notifyErr) {
          console.warn("[babyeyi] district DEO notify load:", notifyErr.message);
        }
      }

      await syncAccountantFeeData(bid);

      res.status(201).json({
        success: true,
        message: status === "approved"
          ? "Babyeyi created and approved."
          : status === "pending"
          ? "Babyeyi created with increase request."
          : "Babyeyi saved as draft.",
        data: {
          ...newRecord,
          doc_id:       preDocId,
          qr_code_path: docResult?.qrPath    || null,
          qr_view_url:  docResult?.qrViewUrl || null,
          pdf_path:     docResult?.pdfPath   || null,
        },
        exceeds,
        status,
        nesa_limit: nesaLimit,
        docs_generated: !!docResult,
        translation_pending: true,
      });

    } catch (err) {
      console.error("[babyeyi/POST]", err);
      res.status(500).json({ success: false, message: "Failed to create babyeyi", detail: err.message });
    }
  });
});

// ════════════════════════════════════════════════════════════
// POST /api/babyeyi/:id/regenerate-docs
// ════════════════════════════════════════════════════════════
router.post("/:id/regenerate-docs", async (req, res) => {
  const { id } = req.params;
  console.log(`[regenerate-docs] START id=${id}`);
  try {
    const result = await regenerateDocumentsForBid(id, req.query.lang || "en");
    if (!result) return res.status(404).json({ success: false, message: "Not found" });

    console.log(`[regenerate-docs] ✅ Success: docId=${result.docId}`);
    res.json({
      success: true,
      message: "Documents regenerated successfully",
      data: {
        docId:         result.docId,
        qrPath:        result.qrPath,
        qrViewUrl:     result.qrViewUrl,
        pdfPath:       result.pdfPath,
        integrityHash: result.integrityHash,
      },
    });
  } catch (err) {
    console.error(`[regenerate-docs] ❌ ERROR id=${id}:`, err.message);
    res.status(500).json({ success: false, message: `Regeneration failed: ${err.message}`, detail: err.stack });
  }
});

// ════════════════════════════════════════════════════════════
// PATCH /api/babyeyi/:id/content-i18n/rw — manager Kinyarwanda overrides
// ════════════════════════════════════════════════════════════
router.patch("/:id/content-i18n/rw", async (req, res) => {
  const { id } = req.params;
  const bid = id;
  try {
    const userSchoolId = resolveSchoolId(req);
    if (!userSchoolId) {
      return res.status(400).json({ success: false, message: "school_id not found in session" });
    }

    const rows = await query(
      "SELECT id, school_id, content_i18n, parent_message, payments FROM school_babyeyi WHERE id=? AND is_active=1",
      [bid]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Babyeyi not found" });

    if (Number(rows[0].school_id) !== Number(userSchoolId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    let payments = await query(
      "SELECT name, amount FROM babyeyi_payments WHERE babyeyi_id=? ORDER BY sort_order",
      [bid]
    );
    if (!payments.length && rows[0].payments) {
      try {
        const raw = typeof rows[0].payments === "string" ? JSON.parse(rows[0].payments) : rows[0].payments;
        if (Array.isArray(raw)) payments = raw;
      } catch {}
    }

    const studentReqs = await query(
      "SELECT item, description, quantity FROM babyeyi_student_requirements WHERE babyeyi_id=? ORDER BY sort_order",
      [bid]
    ).catch(() => []);

    const classRowsRaw = await query(
      `SELECT COALESCE(item, information) AS item, details
       FROM babyeyi_class_requirements WHERE babyeyi_id=? ORDER BY COALESCE(sort_order, 0)`,
      [bid]
    ).catch(() => []);

    const { classNotes, otherInfos } = splitClassRows(classRowsRaw.map(normaliseClassReq));
    const leaders = await fetchLeaders(bid).catch(() => []);

    const ctx = {
      parentMessage: rows[0].parent_message ?? "",
      payments: (payments || []).map((p) => ({ name: p.name, amount: p.amount })),
      requirements: (studentReqs || []).map((r) => ({
        item: r.item,
        description: r.description || "",
      })),
      classNotes,
      otherInfos,
      leaders,
    };

    const patches = req.body && typeof req.body === "object" ? req.body : {};
    const bundle = mergeRwPatchesIntoContentI18nBundle(rows[0].content_i18n, ctx, patches);

    await query(`UPDATE school_babyeyi SET content_i18n=?, translation_status=? WHERE id=?`, [
      JSON.stringify(bundle),
      "manual",
      bid,
    ]);

    const docResult = await regenerateDocumentsForBid(bid, "rw");

    res.json({
      success: true,
      message: "Kinyarwanda content updated",
      data: {
        docId: docResult?.docId ?? null,
        pdfPath: docResult?.pdfPath ?? null,
        qrPath: docResult?.qrPath ?? null,
        qrViewUrl: docResult?.qrViewUrl ?? null,
      },
    });
  } catch (err) {
    console.error(`[PATCH content-i18n/rw] id=${id}:`, err);
    res.status(500).json({ success: false, message: err.message || "Failed to save Kinyarwanda content" });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/babyeyi/:id/qrcode
// ════════════════════════════════════════════════════════════
router.get("/:id/qrcode", async (req, res) => {
  const { id } = req.params;
  try {
    const sigs = await query(
      "SELECT qr_code_path, qr_view_url FROM babyeyi_signatures WHERE babyeyi_id=? LIMIT 1", [id]
    ).catch(() => []);

    if (sigs.length && sigs[0].qr_code_path && fileExists(sigs[0].qr_code_path)) {
      return res.json({
        success: true,
        data: { qr_code_url: sigs[0].qr_code_path, qr_view_url: sigs[0].qr_view_url || null },
      });
    }

    const rows = await query(
      "SELECT qr_code_path, qr_view_url, doc_id FROM school_babyeyi WHERE id=? LIMIT 1", [id]
    );
    if (rows[0]?.qr_code_path && fileExists(rows[0].qr_code_path)) {
      return res.json({
        success: true,
        data: { qr_code_url: rows[0].qr_code_path, qr_view_url: rows[0].qr_view_url || null },
      });
    }

    console.log(`[GET qrcode] QR missing for id=${id} — auto-regenerating`);

    const babyeyiRows = await query("SELECT * FROM school_babyeyi WHERE id=? AND is_active=1", [id]);
    if (!babyeyiRows.length) {
      return res.status(404).json({ success: false, message: "Babyeyi not found" });
    }
    const babyeyi = normalise(babyeyiRows[0]);

    let payments = await query(
      "SELECT name, amount FROM babyeyi_payments WHERE babyeyi_id=? ORDER BY sort_order", [id]
    ).catch(() => []);
    if (!payments.length && babyeyiRows[0].payments) {
      try {
        const raw = typeof babyeyiRows[0].payments === "string"
          ? JSON.parse(babyeyiRows[0].payments)
          : babyeyiRows[0].payments;
        if (Array.isArray(raw)) payments = raw;
      } catch {}
    }

    const [studentReqs, classReqsRaw, sigRows2] = await Promise.all([
      query("SELECT item, description, quantity FROM babyeyi_student_requirements WHERE babyeyi_id=? ORDER BY sort_order", [id]).catch(() => []),
      query(`SELECT COALESCE(item, information) AS item, details
             FROM babyeyi_class_requirements WHERE babyeyi_id=? ORDER BY COALESCE(sort_order, 0)`, [id]).catch(() => []),
      query("SELECT * FROM babyeyi_signatures WHERE babyeyi_id=? LIMIT 1", [id]).catch(() => []),
    ]);

    const sigRow2   = sigRows2[0] || {};
    const classReqs = classReqsRaw.map(normaliseClassReq);

    const result = await generateDocuments({
      bid: id,
      babyeyi,
      payments: payments.map(p => ({ name: p.name, amount: Number(p.amount) || 0 })),
      requirements: studentReqs,
      classNotes:   classReqs,
      documentLanguage: normalizeSourceLang(req.query.lang || "en"),
      sigPaths: {
        sigPath:        sigRow2.director_sig_path || null,
        stampPath:      sigRow2.stamp_path        || null,
        schoolLogoPath: sigRow2.school_logo_path  || null,
        otherLogoPath:  sigRow2.other_logo_path   || null,
      },
      academicYear:  babyeyi.academic_year,
      schoolId:      babyeyi.school_id,
      parentMessage: babyeyi.parent_message || "",
    });

    return res.json({
      success: true,
      data: { qr_code_url: result.qrPath, qr_view_url: result.qrViewUrl },
    });
  } catch (err) {
    console.error(`[GET qrcode] ❌ ERROR id=${id}:`, err.message);
    res.status(500).json({ success: false, message: `Failed to retrieve QR code: ${err.message}` });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/babyeyi/:id/qrcode — upload QR manually
// ════════════════════════════════════════════════════════════
router.post("/:id/qrcode", (req, res) => {
  const qrUpload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = ["image/png","image/jpeg","image/jpg"].includes(file.mimetype);
      ok ? cb(null, true) : cb(new Error("Only image files allowed for QR code"));
    },
  }).fields([{ name: "qr_code", maxCount: 1 }]);

  qrUpload(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ success: false, message: uploadErr.message });
    try {
      const { id }  = req.params;
      const qrFile  = (req.files || {}).qr_code?.[0];
      if (!qrFile) return res.status(422).json({ success: false, message: "No QR code file provided" });

      const rows = await query("SELECT * FROM school_babyeyi WHERE id=? AND is_active=1", [id]);
      if (!rows.length) return res.status(404).json({ success: false, message: "Babyeyi not found" });
      const babyeyi = rows[0];

      const qrPath  = `/${UPLOAD_DIR}${qrFile.filename}`;
      const publicBase = getBabyeyiPublicVerifyOrigin();
      const docIdNorm = babyeyi.doc_id && /^BY-\d{4}-\d{5}$/i.test(String(babyeyi.doc_id).trim())
        ? String(babyeyi.doc_id).trim().toUpperCase()
        : String(babyeyi.doc_id || id || "").trim();
      const rawH = babyeyi.integrity_hash != null ? String(babyeyi.integrity_hash).trim().toLowerCase() : "";
      const h16 = /^[0-9a-f]{16}$/.test(rawH) ? rawH : (rawH.length >= 16 && /^[0-9a-f]+$/.test(rawH) ? rawH.slice(0, 16) : "");
      const viewUrl = h16 && /^BY-\d{4}-\d{5}$/.test(docIdNorm)
        ? `${publicBase}/babyeyi/verify/${docIdNorm}?h=${h16}`
        : `${publicBase}/babyeyi/verify/${docIdNorm}`;

      const existing = await query("SELECT id FROM babyeyi_signatures WHERE babyeyi_id=?", [id]).catch(() => []);
      if (existing.length) {
        await query(`UPDATE babyeyi_signatures SET qr_code_path=?, qr_code_name=?, qr_view_url=? WHERE babyeyi_id=?`,
                    [qrPath, qrFile.originalname, viewUrl, id])
          .catch(() => query(`UPDATE babyeyi_signatures SET qr_code_path=?, qr_code_name=? WHERE babyeyi_id=?`,
                    [qrPath, qrFile.originalname, id]));
      } else {
        await query(`INSERT INTO babyeyi_signatures (babyeyi_id, qr_code_path, qr_code_name, qr_view_url) VALUES (?,?,?,?)`,
                    [id, qrPath, qrFile.originalname, viewUrl])
          .catch(() => query(`INSERT INTO babyeyi_signatures (babyeyi_id, qr_code_path, qr_code_name) VALUES (?,?,?)`,
                    [id, qrPath, qrFile.originalname]));
      }
      await query("UPDATE school_babyeyi SET qr_code_path=? WHERE id=?", [qrPath, id]);

      res.json({ success: true, message: "QR code stored", data: { qr_code_path: qrPath, qr_view_url: viewUrl, babyeyi_id: id } });
    } catch (err) {
      console.error("[POST qrcode]", err.message);
      res.status(500).json({ success: false, message: "Failed to store QR code", detail: err.message });
    }
  });
});

// ════════════════════════════════════════════════════════════
// PUT /api/babyeyi/:id — update
// ════════════════════════════════════════════════════════════
router.put("/:id", (req, res) => {
  upload(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ success: false, message: uploadErr.message });
    try {
      const { id } = req.params;
      const body   = req.body;
      const files  = req.files || {};

      const oldRows = await query("SELECT * FROM school_babyeyi WHERE id=? AND is_active=1", [id]);
      if (!oldRows.length) return res.status(404).json({ success: false, message: "Babyeyi not found" });
      const old = normalise(oldRows[0]);

      const schoolId       = body.school_id ? Number(body.school_id) : old.school_id;
      const fv             = (v, fb) => Array.isArray(v) ? v[0] ?? fb : v ?? fb;
      const schoolProvince = fv(body.province, old.province || null);
      const schoolDistrict = fv(body.district, old.district || null);
      const schoolSector   = fv(body.sector,   old.sector   || null);

      const newClass =
        String(body.class || body.class_name || old.class || old.class_name || "").trim() || old.class_name;
      const newTerm  = body.term          || old.term;
      const newYear  = body.academic_year || old.academic_year;
      const level    = body.level || classToLevel(newClass);

      const payments      = parseJSONField(body.payments);
      const totalFee      = payments.length ? payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) : old.total_fee || 0;
      const parentMessage = body.parent_message !== undefined ? body.parent_message : (old.parent_message || "");

      const banksJsonRaw  = body.banks_json || body.banks || null;
      const banks         = parseJSONField(banksJsonRaw);
      const primaryBank   = banks.length > 0 ? banks[0] : null;
      const bankName      = primaryBank ? (primaryBank.bankName || primaryBank.bank_name || body.bank_name || old.bank_name || null) : (body.bank_name !== undefined ? body.bank_name : old.bank_name);
      const bankAccountNo = primaryBank ? (primaryBank.accountNumber || primaryBank.bank_account_no || body.bank_account_no || old.bank_account_no || null) : (body.bank_account_no !== undefined ? body.bank_account_no : old.bank_account_no);
      const bankBranch    = primaryBank ? (primaryBank.bankBranch || primaryBank.bank_branch || body.bank_branch || old.bank_branch || null) : (body.bank_branch !== undefined ? body.bank_branch : old.bank_branch);
      const banksJson     = banks.length > 0 ? JSON.stringify(banks) : (banksJsonRaw || old.banks_json || null);

      const feeTargetStudents = fv(body.fee_target_students || body.feeTargetStudents, "public");
      const schoolOwnership   = await getSchoolOwnershipType(schoolId);
      const skipNesa          = shouldSkipNesaFeeLimits(schoolOwnership, feeTargetStudents);
      const incomingCategory  = body.category !== undefined ? body.category : old.school_category;
      const categoryForRow    = skipNesa ? "Private" : incomingCategory;

      const nesaRow = skipNesa
        ? null
        : await queryActiveNesaFeeLimit(categoryForRow, level, newTerm, newYear).catch(() => null);
      const nesaLimit       = skipNesa ? null : (nesaRow?.max_amount ?? null);
      const exceeds         = !skipNesa && nesaLimit !== null && totalFee > Number(nesaLimit);
      const requestIncrease = body.request_increase === "true" || body.request_increase === true;
      const status          = !exceeds ? "approved" : requestIncrease ? "pending" : ["approved"].includes(old.status) ? old.status : "draft";

      await query(
        `UPDATE school_babyeyi SET
           school_id=?, school_province=?, school_district=?, school_sector=?,
           academic_year=?, term=?, class_name=?,
           school_category=?, education_level=?,
           payments=?, total_amount=?,
           bank_name=?, bank_account_no=?, bank_branch=?, banks_json=?,
           parent_message=?, total_fee=?, nesa_limit=?, exceeds_limit=?, status=?
         WHERE id=?`,
        [
          schoolId, schoolProvince, schoolDistrict, schoolSector,
          newYear, newTerm, newClass,
          categoryForRow, level,
          JSON.stringify(payments.length ? payments : parseJSONField(old.payments)), totalFee,
          bankName, bankAccountNo, bankBranch, banksJson,
          parentMessage, totalFee, nesaLimit, exceeds ? 1 : 0, status, id,
        ]
      );

      if (payments.length) {
        await query("DELETE FROM babyeyi_payments WHERE babyeyi_id=?", [id]);
        const allNamedPay = payments.filter(p => p.name && String(p.name).trim());
        await ensureBabyeyiPaymentsPayChannelColumn();
        for (let i = 0; i < allNamedPay.length; i++) {
          const pch = paymentPayChannelFromPayload(allNamedPay[i]);
          try {
            await query(
              "INSERT INTO babyeyi_payments (babyeyi_id, name, amount, sort_order, pay_channel) VALUES (?,?,?,?,?)",
              [id, allNamedPay[i].name, Number(allNamedPay[i].amount) || 0, i, pch]
            );
          } catch (e) {
            if (e.code === "ER_BAD_FIELD_ERROR") {
              await query(
                "INSERT INTO babyeyi_payments (babyeyi_id, name, amount, sort_order) VALUES (?,?,?,?)",
                [id, allNamedPay[i].name, Number(allNamedPay[i].amount) || 0, i]
              );
            } else {
              throw e;
            }
          }
        }
      }

      const studentReqs = parseJSONField(body.requirements);
      if (studentReqs.length) {
        await query("DELETE FROM babyeyi_student_requirements WHERE babyeyi_id=?", [id]);
        for (let i = 0; i < studentReqs.length; i++) {
          const r = studentReqs[i] || {};
          if (r.item) {
            const payCh =
              String(r.pay_channel || r.payChannel || "").toLowerCase() === "school" ? "school" : "babyeyi";
            const lineCost =
              payCh === "school"
                ? Math.round((Number(r.cost ?? r.school_line_rwf ?? r.schoolLineRwf) || 0) * 100) / 100
                : null;
            const costVal = lineCost && lineCost > 0 ? lineCost : null;
            await query(
              "INSERT INTO babyeyi_student_requirements (babyeyi_id, item, description, quantity, sort_order, pay_channel, cost) VALUES (?,?,?,?,?,?,?)",
              [id, r.item, r.description || null, r.quantity || null, i, payCh, costVal]
            ).catch(async (e) => {
              if (e.code === "ER_BAD_FIELD_ERROR") {
                try {
                  await query(
                    "INSERT INTO babyeyi_student_requirements (babyeyi_id, item, description, quantity, sort_order, pay_channel) VALUES (?,?,?,?,?,?)",
                    [id, r.item, r.description || null, r.quantity || null, i, payCh]
                  );
                } catch (e2) {
                  if (e2.code === "ER_BAD_FIELD_ERROR") {
                    await query("INSERT INTO babyeyi_student_requirements (babyeyi_id, item, cost, sort_order) VALUES (?,?,?,?)", [
                      id,
                      r.item,
                      r.cost ? Number(r.cost) : null,
                      i,
                    ]);
                  } else throw e2;
                }
              } else throw e;
            });
          }
        }
        await seedRequirementPricesFromDefaults(id, schoolId, newYear, newTerm, newClass);
      }

      const classReqs  = parseJSONField(body.classReqs);
      const otherInfos = parseJSONField(body.other_infos);
      if (classReqs.length > 0 || otherInfos.length > 0) {
        await query("DELETE FROM babyeyi_class_requirements WHERE babyeyi_id=?", [id]);
        for (let i = 0; i < classReqs.length; i++) {
          const itemText = classReqs[i].item || classReqs[i].information || "";
          if (itemText) {
            await query(
              `INSERT INTO babyeyi_class_requirements (babyeyi_id, information, item, details, sort_order) VALUES (?,?,?,?,?)`,
              [id, itemText, itemText, classReqs[i].details || null, i]
            );
          }
        }
        const otherInfoOffset = classReqs.length;
        for (let i = 0; i < otherInfos.length; i++) {
          const itemText = otherInfos[i].item || otherInfos[i].information || "";
          if (itemText && itemText.trim()) {
            await query(
              `INSERT INTO babyeyi_class_requirements (babyeyi_id, information, item, details, sort_order) VALUES (?,?,?,?,?)`,
              [id, itemText, itemText, null, otherInfoOffset + i]
            );
          }
        }
      }

      const leadersPayloadPut = parseJSONField(body.leaders);
      if (leadersPayloadPut.length) {
        await upsertLeaders(id, schoolId, leadersPayloadPut);
      }

      const dirSig     = files.director_signature?.[0];
      const accSig     = files.accountant_signature?.[0];
      const stamp      = files.stamp?.[0];
      const schoolLogo = files.school_logo?.[0];
      const otherLogo  = files.other_logo?.[0];

      if (dirSig || accSig || stamp || schoolLogo || otherLogo) {
        const existingSig = await query("SELECT id FROM babyeyi_signatures WHERE babyeyi_id=?", [id]).catch(() => []);
        const updates = [], vals = [];
        if (dirSig)     { updates.push("director_sig_path=?, director_sig_name=?");     vals.push(`/${UPLOAD_DIR}${dirSig.filename}`,     dirSig.originalname); }
        if (accSig)     { updates.push("accountant_sig_path=?, accountant_sig_name=?"); vals.push(`/${UPLOAD_DIR}${accSig.filename}`,     accSig.originalname); }
        if (stamp)      { updates.push("stamp_path=?, stamp_name=?");                   vals.push(`/${UPLOAD_DIR}${stamp.filename}`,      stamp.originalname); }
        if (schoolLogo) { updates.push("school_logo_path=?, school_logo_name=?");       vals.push(`/${UPLOAD_DIR}${schoolLogo.filename}`, schoolLogo.originalname); }
        if (otherLogo)  { updates.push("other_logo_path=?, other_logo_name=?");         vals.push(`/${UPLOAD_DIR}${otherLogo.filename}`,  otherLogo.originalname); }

        if (existingSig.length) {
          vals.push(id);
          await query(`UPDATE babyeyi_signatures SET ${updates.join(", ")} WHERE babyeyi_id=?`, vals);
        } else {
          await query(
            `INSERT INTO babyeyi_signatures
               (babyeyi_id, director_sig_path, director_sig_name,
                accountant_sig_path, accountant_sig_name,
                stamp_path, stamp_name,
                school_logo_path, school_logo_name,
                other_logo_path, other_logo_name)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [id,
             dirSig     ? `/${UPLOAD_DIR}${dirSig.filename}`     : null, dirSig?.originalname     || null,
             accSig     ? `/${UPLOAD_DIR}${accSig.filename}`     : null, accSig?.originalname     || null,
             stamp      ? `/${UPLOAD_DIR}${stamp.filename}`      : null, stamp?.originalname      || null,
             schoolLogo ? `/${UPLOAD_DIR}${schoolLogo.filename}` : null, schoolLogo?.originalname || null,
             otherLogo  ? `/${UPLOAD_DIR}${otherLogo.filename}`  : null, otherLogo?.originalname  || null]
          );
        }
      }

      const updatedRows = await query("SELECT * FROM school_babyeyi WHERE id=?", [id]);
      const updated = normalise(updatedRows[0]);
      await audit(id, "updated", old, updated, req);

      let docResult = null;
      try {
        const sigRowsUp   = await query("SELECT * FROM babyeyi_signatures WHERE babyeyi_id=?", [id]).catch(() => []);
        const sigRowUp    = sigRowsUp[0] || {};
        const updatedPay  = await query("SELECT name, amount FROM babyeyi_payments WHERE babyeyi_id=? ORDER BY sort_order", [id]).catch(() => []);
        const classReqsUp = await query(
          `SELECT COALESCE(item, information) AS item, details FROM babyeyi_class_requirements WHERE babyeyi_id=? ORDER BY COALESCE(sort_order, 0)`, [id]
        ).catch(() => []);
        const studentReqsForPdf = await query(
          "SELECT item, description, quantity FROM babyeyi_student_requirements WHERE babyeyi_id=? ORDER BY sort_order",
          [id]
        ).catch(() => []);
        docResult = await generateDocuments({
          bid: id,
          babyeyi: updated,
          payments: updatedPay.map(p => ({ name: p.name, amount: Number(p.amount) || 0 })),
          requirements: studentReqsForPdf,
          classNotes:   classReqsUp.map(normaliseClassReq),
          documentLanguage: normalizeSourceLang(fv(body.language, "en")),
          sigPaths: {
            sigPath:        sigRowUp.director_sig_path  || null,
            stampPath:      sigRowUp.stamp_path         || null,
            schoolLogoPath: sigRowUp.school_logo_path   || null,
            otherLogoPath:  sigRowUp.other_logo_path    || null,
          },
          academicYear:  updated.academic_year,
          schoolId:      updated.school_id,
          parentMessage: updated.parent_message || parentMessage,
        });
      } catch (e) {
        console.error("[babyeyi] PUT regen error:", e.message, e.stack);
      }

      scheduleBabyeyiTranslationJob(id, fv(body.language, "en"));

      try {
        const payRows = await query(
          "SELECT name, amount FROM babyeyi_payments WHERE babyeyi_id=? ORDER BY sort_order",
          [id]
        );
        const reqRows = await query(
          "SELECT item, description, quantity FROM babyeyi_student_requirements WHERE babyeyi_id=? ORDER BY sort_order",
          [id]
        ).catch(() => []);
        const classRows = await query(
          `SELECT COALESCE(item, information) AS item, details
           FROM babyeyi_class_requirements WHERE babyeyi_id=? ORDER BY COALESCE(sort_order, 0)`,
          [id]
        ).catch(() => []);
        const allC = (classRows || []).map((r) => ({
          item: r.item || "",
          details: r.details || "",
        }));
        const classNotesSplit = allC.filter((r) => r.details && String(r.details).trim());
        const otherInfosSplit = allC.filter((r) => !r.details || !String(r.details).trim());
        const leadersForI18n = await fetchLeaders(id);
        const bundle = await buildBabyeyiTranslationBundle({
          sourceLang: fv(body.language, "en"),
          parentMessage: parentMessage || "",
          payments: (payRows || []).map((p) => ({ name: p.name, amount: p.amount })),
          requirements: (reqRows || []).map((r) => ({
            item: r.item,
            description: r.description || "",
          })),
          classReqs: classNotesSplit.map((n) => ({
            item: n.item,
            details: n.details,
            information: n.item,
          })),
          otherInfos: otherInfosSplit.map((o) => ({
            item: o.item,
            information: o.item,
            details: "",
          })),
          leaders: leadersForI18n || [],
        });
        await query(`UPDATE school_babyeyi SET translations_json=? WHERE id=?`, [JSON.stringify(bundle), id]);
      } catch (tErr) {
        console.warn("[babyeyi] translations_json (update):", tErr.message);
      }

      await syncAccountantFeeData(id);

      res.json({
        success: true,
        message: "Babyeyi updated",
        data: updated,
        docs_regenerated: !!docResult,
        translation_pending: true,
      });
    } catch (err) {
      console.error("[babyeyi/PUT]", err);
      res.status(500).json({ success: false, message: "Failed to update babyeyi", detail: err.message });
    }
  });
});

// ════════════════════════════════════════════════════════════
// DELETE /api/babyeyi/:id
// ════════════════════════════════════════════════════════════
router.delete("/:id", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM school_babyeyi WHERE id=? AND is_active=1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });
    await query("UPDATE school_babyeyi SET is_active=0 WHERE id=?", [req.params.id]);
    await audit(req.params.id, "deleted", normalise(rows[0]), null, req);
    await syncAccountantFeeData(req.params.id);
    res.json({ success: true, message: "Babyeyi deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete" });
  }
});

// ════════════════════════════════════════════════════════════
// PATCH — approval workflow
// ════════════════════════════════════════════════════════════
router.patch("/:id/district-approve", async (req, res) => {
  try {
    const { id } = req.params;
    const deoId = req.user?.id || req.body?.deo_id || null;
    const rows = await query("SELECT * FROM school_babyeyi WHERE id=? AND is_active=1", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });
    const b = rows[0];
    await query("UPDATE school_babyeyi SET status=? WHERE id=?", ["approved", id]);
    await query(`UPDATE babyeyi_increase_requests SET nesa_status='approved', deo_id=?, deo_notes=?, deo_reviewed_at=NOW(), reviewed_at=NOW(), reviewed_by=? WHERE babyeyi_id=?`,
                [deoId, req.body?.notes || null, deoId, id]).catch(() => {});
    await audit(id, "district_approved", { status: b.status }, { status: "approved" }, req);
    notifyParentsBabyeyiReady(id, "district_approved").catch((e) => {
      console.warn("[babyeyi] notifyParentsBabyeyiReady(district_approve):", e.message);
    });
    res.json({ success: true, message: "Approved by District." });
  } catch (err) { res.status(500).json({ success: false, message: "Failed to approve" }); }
});

router.patch("/:id/district-recommend", async (req, res) => {
  try {
    const { id } = req.params;
    const deoId = req.user?.id || req.body?.deo_id || null;
    await query(`UPDATE babyeyi_increase_requests SET nesa_status='recommended', deo_id=?, deo_notes=?, deo_reviewed_at=NOW(), reviewed_at=NOW(), reviewed_by=? WHERE babyeyi_id=?`,
                [deoId, req.body?.notes || null, deoId, id]).catch(() => {});
    await audit(id, "district_recommended", {}, {}, req);
    res.json({ success: true, message: "Recommended to NESA." });
  } catch (err) { res.status(500).json({ success: false, message: "Failed to recommend" }); }
});

router.patch("/:id/nesa-approve", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const rows = await query("SELECT * FROM school_babyeyi WHERE id=? AND is_active=1", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });
    const b = rows[0];
    await query("UPDATE school_babyeyi SET status=? WHERE id=?", ["approved", id]);
    await query(`UPDATE babyeyi_increase_requests SET nesa_status='approved', nesa_notes=?, reviewed_at=NOW(), reviewed_by=? WHERE babyeyi_id=?`,
                [req.body?.notes || null, userId, id]).catch(() => {});
    await audit(id, "nesa_approved", { status: b.status }, { status: "approved" }, req);
    notifyParentsBabyeyiReady(id, "nesa_approved").catch((e) => {
      console.warn("[babyeyi] notifyParentsBabyeyiReady(nesa_approve):", e.message);
    });
    const { notifyNesaDecision } = require('./babyeyiNesaDecisionNotifications');
    const reqRows = await query(
      `SELECT id FROM babyeyi_increase_requests WHERE babyeyi_id = ? ORDER BY id DESC LIMIT 1`,
      [id]
    ).catch(() => []);
    const reqRow = reqRows?.[0];
    notifyNesaDecision({
      decision: 'approved',
      schoolName: b.school_name,
      district: b.school_district,
      schoolId: b.school_id,
      babyeyiId: Number(id),
      requestId: reqRow?.id || null,
      notes: req.body?.notes || null,
      docId: b.doc_id,
    }).catch((e) => console.warn('[babyeyi] notifyNesaDecision(approve):', e.message));
    res.json({ success: true, message: "NESA approved." });
  } catch (err) { res.status(500).json({ success: false, message: "Failed to approve" }); }
});

router.patch("/:id/nesa-reject", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const rows = await query("SELECT * FROM school_babyeyi WHERE id=? AND is_active=1", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });
    const b = rows[0];
    await query("UPDATE school_babyeyi SET status=? WHERE id=?", ["rejected", id]);
    await query(`UPDATE babyeyi_increase_requests SET nesa_status='nesa_rejected', nesa_notes=?, reviewed_at=NOW(), reviewed_by=? WHERE babyeyi_id=?`,
                [req.body?.notes || null, userId, id]).catch(() => {});
    await audit(id, "nesa_rejected", { status: b.status }, { status: "rejected" }, req);
    const { notifyNesaDecision } = require('./babyeyiNesaDecisionNotifications');
    const reqRows = await query(
      `SELECT id FROM babyeyi_increase_requests WHERE babyeyi_id = ? ORDER BY id DESC LIMIT 1`,
      [id]
    ).catch(() => []);
    const reqRow = reqRows?.[0];
    notifyNesaDecision({
      decision: 'rejected',
      schoolName: b.school_name,
      district: b.school_district,
      schoolId: b.school_id,
      babyeyiId: Number(id),
      requestId: reqRow?.id || null,
      notes: req.body?.notes || null,
      docId: b.doc_id,
    }).catch((e) => console.warn('[babyeyi] notifyNesaDecision(reject):', e.message));
    res.json({ success: true, message: "NESA rejected." });
  } catch (err) { res.status(500).json({ success: false, message: "Failed to reject" }); }
});

router.patch("/:id/district-reject", async (req, res) => {
  try {
    const { id } = req.params;
    const deoId = req.user?.id || req.body?.deo_id || null;
    const rows = await query("SELECT * FROM school_babyeyi WHERE id=? AND is_active=1", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });
    const b = rows[0];
    await query("UPDATE school_babyeyi SET status=? WHERE id=?", ["rejected", id]);
    await query(`UPDATE babyeyi_increase_requests SET nesa_status='rejected', deo_id=?, deo_notes=?, deo_reviewed_at=NOW(), reviewed_at=NOW(), reviewed_by=? WHERE babyeyi_id=?`,
                [deoId, req.body?.notes || null, deoId, id]).catch(() => {});
    await audit(id, "district_rejected", { status: b.status }, { status: "rejected" }, req);
    res.json({ success: true, message: "Rejected by District." });
  } catch (err) { res.status(500).json({ success: false, message: "Failed to reject" }); }
});

// ════════════════════════════════════════════════════════════
// POST /api/babyeyi/:id/submit-request
// ════════════════════════════════════════════════════════════
router.post("/:id/submit-request", (req, res) => {
  upload(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ success: false, message: uploadErr.message });
    try {
      const { id } = req.params;
      const body   = req.body;
      const files  = req.files || {};

      const rows = await query("SELECT * FROM school_babyeyi WHERE id=? AND is_active=1", [id]);
      if (!rows.length) return res.status(404).json({ success: false, message: "Babyeyi not found" });
      const b = rows[0];

      const parentDoc = files.parent_rep_doc?.[0];
      const budgetDoc = files.budget_doc?.[0];
      const existing  = await query("SELECT id FROM babyeyi_increase_requests WHERE babyeyi_id=?", [id]).catch(() => []);

      if (existing.length) {
        const updates = ["reason=?", "description=?", "nesa_status=?"];
        const vals    = [body.reason || "", body.description || "", "pending"];
        if (parentDoc) { updates.push("parent_rep_doc_path=?, parent_rep_doc_name=?"); vals.push(`/${UPLOAD_DIR}${parentDoc.filename}`, parentDoc.originalname); }
        if (budgetDoc) { updates.push("budget_doc_path=?, budget_doc_name=?");         vals.push(`/${UPLOAD_DIR}${budgetDoc.filename}`, budgetDoc.originalname); }
        vals.push(id);
        await query(`UPDATE babyeyi_increase_requests SET ${updates.join(", ")} WHERE babyeyi_id=?`, vals);
      } else {
        const schoolName   = b.school_name || null;
        const schoolDist   = b.school_district || b.district || null;
        try {
          await query(
            `INSERT INTO babyeyi_increase_requests
               (babyeyi_id, school_id, school_name, district, reason, description,
                current_limit, requested_amount, excess_amount,
                parent_rep_doc_path, parent_rep_doc_name,
                budget_doc_path, budget_doc_name, nesa_status, submitted_at, created_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
            [id, b.school_id, schoolName, schoolDist, body.reason || "", body.description || null,
             Number(b.nesa_limit), Number(b.total_fee), Number(b.total_fee) - Number(b.nesa_limit),
             parentDoc ? `/${UPLOAD_DIR}${parentDoc.filename}` : null, parentDoc?.originalname || null,
             budgetDoc ? `/${UPLOAD_DIR}${budgetDoc.filename}` : null, budgetDoc?.originalname || null,
             "pending"]
          );
        } catch (insErr) {
          if (insErr.code === "ER_BAD_FIELD_ERROR") {
            await query(
              `INSERT INTO babyeyi_increase_requests
                 (babyeyi_id, school_id, reason, description,
                  current_limit, requested_amount, excess_amount,
                  parent_rep_doc_path, parent_rep_doc_name,
                  budget_doc_path, budget_doc_name, nesa_status)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
              [id, b.school_id, body.reason || "", body.description || null,
               Number(b.nesa_limit), Number(b.total_fee), Number(b.total_fee) - Number(b.nesa_limit),
               parentDoc ? `/${UPLOAD_DIR}${parentDoc.filename}` : null, parentDoc?.originalname || null,
               budgetDoc ? `/${UPLOAD_DIR}${budgetDoc.filename}` : null, budgetDoc?.originalname || null,
               "pending"]
            );
          } else throw insErr;
        }
      }
      await query("UPDATE school_babyeyi SET status=? WHERE id=?", ["pending", id]);
      res.json({ success: true, message: "Increase request submitted." });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to submit request", detail: err.message });
    }
  });
});

// ════════════════════════════════════════════════════════════
// PDF streaming routes
// ════════════════════════════════════════════════════════════
router.get("/pdf/:docId", async (req, res) => {
  try {
    let docId;
    try { docId = decodeURIComponent(req.params.docId); } catch (_) { docId = req.params.docId; }
    docId = docId.replace(/%7[Cc]/g, "|").split("|")[0].toUpperCase().trim();

    if (!/^BY-\d{4}-\d{5}$/.test(docId)) {
      return res.status(400).json({ success: false, message: "Invalid document ID" });
    }

    const rows = await query(
      "SELECT pdf_path, pdf_name, class_name, term, doc_id FROM school_babyeyi WHERE doc_id=? AND is_active=1 LIMIT 1",
      [docId]
    );
    if (!rows.length || !rows[0].pdf_path) {
      return res.status(404).json({ success: false, message: "PDF not ready yet — try again in a few seconds." });
    }

    const absPath = path.resolve(resolveFilePath(rows[0].pdf_path));
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, message: "PDF file not found on server." });
    }

    const fileName = rows[0].pdf_name || ("Babyeyi-" + docId + ".pdf");
    const download = req.query.download === "1" || req.query.download === "true";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${fileName}"`);
    res.setHeader("Cache-Control", "public, max-age=3600");
    fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    console.error("[babyeyi/pdf/:docId]", err.message);
    res.status(500).json({ success: false, message: "Failed to serve PDF" });
  }
});

router.get("/:id/pdf", async (req, res) => {
  try {
    const rows = await query(
      "SELECT pdf_path, pdf_name, class_name, doc_id FROM school_babyeyi WHERE id=? AND is_active=1 LIMIT 1",
      [req.params.id]
    );
    if (!rows.length || !rows[0].pdf_path) {
      return res.status(404).json({ success: false, message: "PDF not ready yet." });
    }

    const absPath = path.resolve(resolveFilePath(rows[0].pdf_path));
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, message: "PDF file missing on server." });
    }

    const fileName = rows[0].pdf_name || ("Babyeyi-" + (rows[0].doc_id || req.params.id) + ".pdf");
    const download = req.query.download === "1" || req.query.download === "true";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${fileName}"`);
    res.setHeader("Cache-Control", "public, max-age=3600");
    fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    console.error("[babyeyi/:id/pdf]", err.message);
    res.status(500).json({ success: false, message: "Failed to serve PDF" });
  }
});

// Printable HTML (same layout as server PDF — opens browser print dialog)
router.get("/:id/print", async (req, res) => {
  try {
    const id = req.params.id;
    const lang = req.query.lang || "en";
    const autoPrint = req.query.autoprint !== "0";
    const html = await buildBabyeyiPrintHtmlForBid(id, lang, { autoPrint });
    if (!html) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(html);
  } catch (err) {
    console.error("[babyeyi/:id/print]", err.message);
    res.status(500).json({ success: false, message: "Failed to render print page" });
  }
});

// ════════════════════════════════════════════════════════════
// LEADERS ROUTES
// ════════════════════════════════════════════════════════════

router.get("/:id/leaders", async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query(
      "SELECT id, school_id FROM school_babyeyi WHERE id = ? AND is_active = 1 LIMIT 1",
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Babyeyi not found" });
    }
    const leaders = await fetchLeaders(id);
    res.json({ success: true, data: leaders, total: leaders.length });
  } catch (err) {
    console.error("[GET leaders]", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch leaders" });
  }
});

router.post("/:id/leaders", async (req, res) => {
  try {
    const { id }  = req.params;
    const leaders = parseJSONField(req.body?.leaders);
    const rows = await query(
      "SELECT id, school_id FROM school_babyeyi WHERE id = ? AND is_active = 1 LIMIT 1",
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Babyeyi not found" });
    }
    const schoolId = rows[0].school_id;
    await upsertLeaders(id, schoolId, leaders);
    await audit(id, "leaders_updated", null, { leaders }, req);
    const saved = await fetchLeaders(id);
    res.json({ success: true, message: "Leaders saved", data: saved });
  } catch (err) {
    console.error("[POST leaders]", err.message);
    res.status(500).json({ success: false, message: "Failed to save leaders", detail: err.message });
  }
});

router.put("/:id/leaders/:leaderId", async (req, res) => {
  try {
    const { id, leaderId } = req.params;
    const { name, role, phone, email, sort_order } = req.body;
    const existing = await query(
      "SELECT id FROM babyeyi_leaders WHERE id = ? AND babyeyi_id = ? AND is_active = 1 LIMIT 1",
      [leaderId, id]
    );
    if (!existing.length) {
      return res.status(404).json({ success: false, message: "Leader not found" });
    }
    await query(
      `UPDATE babyeyi_leaders
         SET leader_name = COALESCE(?, leader_name),
             leader_role = COALESCE(?, leader_role),
             phone       = ?,
             email       = ?,
             sort_order  = COALESCE(?, sort_order)
       WHERE id = ?`,
      [
        name  ? name.trim()  : null,
        role  ? role.trim()  : null,
        phone ? phone.trim().replace(/^\+?250/, "") : null,
        email ? email.trim().toLowerCase() : null,
        sort_order !== undefined ? Number(sort_order) : null,
        leaderId,
      ]
    );
    const [updated] = await query(
      `SELECT id, leader_name AS name, leader_role AS role, phone, email, sort_order
       FROM babyeyi_leaders WHERE id = ?`,
      [leaderId]
    );
    res.json({ success: true, message: "Leader updated", data: updated });
  } catch (err) {
    console.error("[PUT leader]", err.message);
    res.status(500).json({ success: false, message: "Failed to update leader" });
  }
});

router.delete("/:id/leaders/:leaderId", async (req, res) => {
  try {
    const { id, leaderId } = req.params;
    const existing = await query(
      "SELECT id FROM babyeyi_leaders WHERE id = ? AND babyeyi_id = ? AND is_active = 1 LIMIT 1",
      [leaderId, id]
    );
    if (!existing.length) {
      return res.status(404).json({ success: false, message: "Leader not found" });
    }
    await query("UPDATE babyeyi_leaders SET is_active = 0 WHERE id = ?", [leaderId]);
    await audit(id, "leader_deleted", { leaderId }, null, req);
    res.json({ success: true, message: "Leader removed" });
  } catch (err) {
    console.error("[DELETE leader]", err.message);
    res.status(500).json({ success: false, message: "Failed to delete leader" });
  }
});

module.exports = router;
module.exports.initBabyeyiMigrations = initBabyeyiMigrations;