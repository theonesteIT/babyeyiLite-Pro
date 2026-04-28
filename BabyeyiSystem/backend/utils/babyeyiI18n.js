/**
 * Babyeyi translation bundle for school_babyeyi.translations_json.
 *
 * v2: Stores the same structured snapshot for en/rw/fr (no machine translation).
 * UI labels are resolved from i18n JSON on the client and in PDF generation;
 * user-authored content (parent message, fee lines, notes, names) is never
 * auto-translated here.
 */

const TARGETS = ["en", "rw", "fr"];

function normalizeSourceLang(raw) {
  const s = String(raw || "en").trim().toLowerCase();
  if (s.startsWith("rw")) return "rw";
  if (s.startsWith("fr")) return "fr";
  return "en";
}

function extractStructured({
  parentMessage = "",
  payments = [],
  requirements = [],
  classReqs = [],
  otherInfos = [],
  leaders = [],
}) {
  const paymentNames = (payments || []).map((p) => String(p?.name || "").trim());
  const reqItems = (requirements || []).map((r) => String(r?.item || "").trim());
  const reqDescs = (requirements || []).map((r) => String(r?.description || "").trim());
  const noteItems = (classReqs || []).map((c) => String(c?.item || c?.information || "").trim());
  const noteDetails = (classReqs || []).map((c) => String(c?.details || "").trim());
  const otherItems = (otherInfos || []).map((o) => String(o?.item || o?.information || "").trim());
  const otherDetails = (otherInfos || []).map((o) => String(o?.details || "").trim());
  const leaderNames = (leaders || []).map((l) => String(l?.name || "").trim());
  const leaderRoles = (leaders || []).map((l) => String(l?.role || "").trim());

  return {
    parentMessage: String(parentMessage || "").trim(),
    paymentNames,
    reqItems,
    reqDescs,
    noteItems,
    noteDetails,
    otherItems,
    otherDetails,
    leaderNames,
    leaderRoles,
    counts: {
      payments: paymentNames.length,
      reqs: reqItems.length,
      notes: noteItems.length,
      others: otherItems.length,
      leaders: leaderNames.length,
    },
  };
}

function mirrorPack(baseStructured) {
  return {
    ...baseStructured,
    paymentNames: [...baseStructured.paymentNames],
    reqItems: [...baseStructured.reqItems],
    reqDescs: [...baseStructured.reqDescs],
    noteItems: [...baseStructured.noteItems],
    noteDetails: [...baseStructured.noteDetails],
    otherItems: [...baseStructured.otherItems],
    otherDetails: [...baseStructured.otherDetails],
    leaderNames: [...baseStructured.leaderNames],
    leaderRoles: [...baseStructured.leaderRoles],
  };
}

/**
 * Build bundle { v:2, source, en, rw, fr } — identical snapshots (no MT).
 */
function buildBabyeyiTranslationBundle(ctx) {
  const source = normalizeSourceLang(ctx.sourceLang);
  const base = extractStructured(ctx);
  const pack = mirrorPack(base);

  const bundle = {
    v: 2,
    source,
    generatedAt: new Date().toISOString(),
    freeTier: false,
    translationEngine: "static-i18n",
    en: pack,
    rw: mirrorPack(base),
    fr: mirrorPack(base),
  };

  return bundle;
}

function applyTranslationBundle(rec, bundle, lang) {
  if (!rec) return rec;
  const code = TARGETS.includes(lang) ? lang : "en";
  return {
    ...rec,
    _translationLang: code,
  };
}

module.exports = {
  TARGETS,
  normalizeSourceLang,
  buildBabyeyiTranslationBundle,
  applyTranslationBundle,
  extractStructured,
};
