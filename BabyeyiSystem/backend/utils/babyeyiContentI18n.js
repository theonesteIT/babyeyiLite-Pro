/**
 * Persisted multilingual *content* for Babyeyi (school_babyeyi.content_i18n).
 * v3: English is written by the manager; rw/fr are generated once and stored.
 *
 * mergeLocalized* helpers pick rw/fr from DB with fallback to en — no live MT at render time.
 */

const {
  translateFieldToRwFr,
  ENABLED,
  PROVIDER,
} = require("./babyeyiContentTranslator");

const LANGS = ["en", "rw", "fr"];

function normalizeLang(raw) {
  const s = String(raw || "en").trim().toLowerCase();
  if (s.startsWith("rw")) return "rw";
  if (s.startsWith("fr")) return "fr";
  return "en";
}

function parseContentI18n(raw) {
  if (!raw) return null;
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    return o && o.v === 3 ? o : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ en?: string, rw?: string, fr?: string }|null|undefined} triplet
 * @param {string} lang
 * @param {string} fallbackEn - English from DB row (source)
 */
function getLocalizedContent(triplet, lang, fallbackEn) {
  const l = normalizeLang(lang);
  const fb = String(fallbackEn ?? "");
  if (!triplet || typeof triplet !== "object") return fb;
  const pick = triplet[l];
  if (pick != null && String(pick).trim() !== "") return String(pick);
  const en = triplet.en != null && String(triplet.en).trim() !== "" ? String(triplet.en) : "";
  return en || fb;
}

/**
 * Split class_requirements rows the same way as PUT handler:
 * rows with non-empty details → class notes; others → other info.
 */
function splitClassRows(classRows) {
  const all = (classRows || []).map((r) => ({
    item: String(r.item || r.information || "").trim(),
    details: String(r.details || "").trim(),
  }));
  const classNotes = all.filter((r) => r.details);
  const otherInfos = all.filter((r) => !r.details);
  return { classNotes, otherInfos };
}

/**
 * Build v3 JSON from English rows (async, calls translation provider).
 */
async function buildContentI18nFromEnglish({
  parentMessage = "",
  payments = [],
  requirements = [],
  classNotes = [],
  otherInfos = [],
  leaders = [],
}) {
  const errors = [];
  const onError = (target, err) => {
    errors.push({ target, message: err.message || String(err) });
  };

  const parentMessageTriplet = await translateFieldToRwFr(parentMessage, onError);

  const tick = () => new Promise((r) => setTimeout(r, 15));

  const paymentTriplets = [];
  for (let i = 0; i < payments.length; i++) {
    const name = payments[i]?.name ?? "";
    paymentTriplets.push(await translateFieldToRwFr(name, onError));
    await tick();
  }

  const reqTriplets = [];
  for (let i = 0; i < requirements.length; i++) {
    const item = requirements[i]?.item ?? "";
    const description = requirements[i]?.description ?? "";
    reqTriplets.push({
      item: await translateFieldToRwFr(item, onError),
      description: description ? await translateFieldToRwFr(description, onError) : { en: "", rw: "", fr: "" },
    });
    await tick();
  }

  const classNoteTriplets = [];
  for (let i = 0; i < classNotes.length; i++) {
    const item = classNotes[i]?.item ?? classNotes[i]?.information ?? "";
    const details = classNotes[i]?.details ?? "";
    classNoteTriplets.push({
      item: await translateFieldToRwFr(item, onError),
      details: details ? await translateFieldToRwFr(details, onError) : { en: "", rw: "", fr: "" },
    });
    await tick();
  }

  const otherTriplets = [];
  for (let i = 0; i < otherInfos.length; i++) {
    const item = otherInfos[i]?.item ?? otherInfos[i]?.information ?? "";
    otherTriplets.push({
      item: await translateFieldToRwFr(item, onError),
      details: { en: "", rw: "", fr: "" },
    });
    await tick();
  }

  const leaderTriplets = [];
  for (let i = 0; i < leaders.length; i++) {
    const role = leaders[i]?.role ?? leaders[i]?.leader_role ?? "";
    leaderTriplets.push({
      role: await translateFieldToRwFr(role, onError),
    });
    await tick();
  }

  let status = "complete";
  if (errors.length) status = errors.length > 4 ? "failed" : "partial";

  return {
    v: 3,
    sourceLang: "en",
    generatedAt: new Date().toISOString(),
    status,
    engine: ENABLED && PROVIDER !== "noop" ? PROVIDER : "noop",
    errors: errors.length ? errors.slice(0, 30) : undefined,
    parentMessage: parentMessageTriplet,
    payments: paymentTriplets,
    requirements: reqTriplets,
    classNotes: classNoteTriplets,
    otherInfos: otherTriplets,
    leaders: leaderTriplets,
  };
}

/**
 * Walk class_requirements rows in DB order: rows with details → bundle.classNotes[*],
 * rows without details → bundle.otherInfos[*].
 */
function mergeClassNotesRows(classRows, lang, contentI18n) {
  const bundle = parseContentI18n(contentI18n);
  const l = normalizeLang(lang);
  const rows = Array.isArray(classRows) ? classRows : [];
  if (l === "en" || !bundle) {
    return rows.map((c) => ({
      ...c,
      item: c.item || c.information || "",
      information: c.item || c.information || "",
    }));
  }

  let noteIdx = 0;
  let otherIdx = 0;
  return rows.map((c) => {
    const itemBase = c.item || c.information || "";
    const det = String(c.details || "").trim();
    if (det) {
      const tri = bundle.classNotes?.[noteIdx++];
      return {
        ...c,
        item: getLocalizedContent(tri?.item, l, itemBase),
        information: getLocalizedContent(tri?.item, l, itemBase),
        details: getLocalizedContent(tri?.details, l, c.details || ""),
      };
    }
    const tri = bundle.otherInfos?.[otherIdx++];
    return {
      ...c,
      item: getLocalizedContent(tri?.item, l, itemBase),
      information: getLocalizedContent(tri?.item, l, itemBase),
      details: c.details || null,
    };
  });
}

/**
 * Merge stored i18n into payload used for PDF / API (does not mutate DB rows).
 */
function mergeLocalizedBabyeyiPayload({
  lang,
  parentMessage,
  payments,
  requirements,
  classNotes,
  leaders,
  contentI18n,
}) {
  const l = normalizeLang(lang);
  const bundle = parseContentI18n(contentI18n);
  if (l === "en" || !bundle) {
    return {
      parentMessage: parentMessage ?? "",
      payments: Array.isArray(payments) ? payments.map((p) => ({ ...p })) : [],
      requirements: Array.isArray(requirements) ? requirements.map((r) => ({ ...r })) : [],
      classNotes: mergeClassNotesRows(classNotes, "en", null),
      leaders: Array.isArray(leaders) ? leaders.map((x) => ({ ...x })) : [],
    };
  }

  const pm = getLocalizedContent(bundle.parentMessage, l, parentMessage);

  const pay = (payments || []).map((p, i) => {
    const tri = bundle.payments?.[i]?.name;
    const name = getLocalizedContent(tri, l, p.name);
    return { ...p, name };
  });

  const reqs = (requirements || []).map((r, i) => {
    const tri = bundle.requirements?.[i];
    const item = getLocalizedContent(tri?.item, l, r.item);
    const description = r.description != null
      ? getLocalizedContent(tri?.description, l, r.description)
      : r.description;
    return { ...r, item, description };
  });

  const notes = mergeClassNotesRows(classNotes, l, contentI18n);

  const ldrs = (leaders || []).map((ldr, i) => {
    const tri = bundle.leaders?.[i]?.role;
    const role = getLocalizedContent(tri, l, ldr.role || ldr.leader_role);
    return { ...ldr, role, leader_role: role };
  });

  return {
    parentMessage: pm,
    payments: pay,
    requirements: reqs,
    classNotes: notes,
    leaders: ldrs,
  };
}

/**
 * For GET responses: split merged class rows back into class_requirements-shaped list
 * (same ordering as DB): class notes first, then other infos.
 */
function mergeClassRequirementsFromI18n(classRowsRaw, lang, contentI18n) {
  return mergeClassNotesRows(classRowsRaw, lang, contentI18n);
}

/**
 * Load English narrative from DB, build v3 bundle, persist to school_babyeyi.content_i18n.
 */
async function buildAndPersistContentI18n(bid, { query, fetchLeaders }) {
  const rows = await query("SELECT parent_message FROM school_babyeyi WHERE id=?", [bid]);
  const parentMessage = rows[0]?.parent_message ?? "";

  const payRows = await query(
    "SELECT name, amount FROM babyeyi_payments WHERE babyeyi_id=? ORDER BY sort_order",
    [bid]
  ).catch(() => []);

  const reqRows = await query(
    "SELECT item, description, quantity FROM babyeyi_student_requirements WHERE babyeyi_id=? ORDER BY sort_order",
    [bid]
  ).catch(() => []);

  const classRows = await query(
    `SELECT COALESCE(item, information) AS item, details
     FROM babyeyi_class_requirements WHERE babyeyi_id=? ORDER BY COALESCE(sort_order, 0)`,
    [bid]
  ).catch(() => []);

  const { classNotes, otherInfos } = splitClassRows(classRows);
  const leaders = await fetchLeaders(bid).catch(() => []);

  let bundle;
  try {
    bundle = await buildContentI18nFromEnglish({
      parentMessage,
      payments: (payRows || []).map((p) => ({ name: p.name, amount: p.amount })),
      requirements: (reqRows || []).map((r) => ({
        item: r.item,
        description: r.description || "",
      })),
      classNotes: classNotes.map((c) => ({
        item: c.item,
        details: c.details,
        information: c.item,
      })),
      otherInfos: otherInfos.map((c) => ({
        item: c.item,
        information: c.item,
      })),
      leaders,
    });
  } catch (e) {
    console.error("[buildAndPersistContentI18n] translate failed:", e.message);
    bundle = {
      v: 3,
      sourceLang: "en",
      generatedAt: new Date().toISOString(),
      status: "failed",
      engine: "error",
      errors: [{ target: "build", message: e.message }],
      parentMessage: { en: parentMessage, rw: "", fr: "" },
      payments: [],
      requirements: [],
      classNotes: [],
      otherInfos: [],
      leaders: [],
    };
  }

  const status = bundle.status || "partial";
  await query(
    `UPDATE school_babyeyi SET content_i18n=?, translation_status=? WHERE id=?`,
    [JSON.stringify(bundle), status, bid]
  );

  return bundle;
}

module.exports = {
  LANGS,
  normalizeLang,
  parseContentI18n,
  getLocalizedContent,
  splitClassRows,
  mergeClassNotesRows,
  buildContentI18nFromEnglish,
  mergeLocalizedBabyeyiPayload,
  mergeClassRequirementsFromI18n,
  buildAndPersistContentI18n,
};
