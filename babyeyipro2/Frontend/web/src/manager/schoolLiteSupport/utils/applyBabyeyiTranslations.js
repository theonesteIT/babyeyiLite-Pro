/**
 * Legacy hook: server may still store translations_json (v1 machine-translated bundles).
 * We no longer apply that bundle to document content — labels come from i18n JSON;
 * dynamic fields (fees, messages, notes) stay exactly as stored in the database.
 */

const TARGETS = ["en", "rw", "fr"];

export function applyTranslationBundle(rec, bundle, lang) {
  if (!rec) return rec;
  const code = TARGETS.includes(lang) ? lang : "en";
  return {
    ...rec,
    _translationLang: code,
  };
}

export function parseTranslationsJson(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function applyTranslationBundleIf(rec, lang) {
  return applyTranslationBundle(rec, rec?.translationsJson, lang);
}
