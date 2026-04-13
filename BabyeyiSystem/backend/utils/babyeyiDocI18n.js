/**
 * Loads Babyeyi document strings from frontend/src/i18n/*.json (single source of truth).
 */
const fs = require("fs");
const path = require("path");

const CACHE = {};

function localePath(lang) {
  return path.join(__dirname, "../../frontend/src/i18n", `${lang}.json`);
}

function loadLocale(lang) {
  const code = ["en", "rw", "fr"].includes(lang) ? lang : "en";
  if (CACHE[code]) return CACHE[code];
  try {
    const raw = fs.readFileSync(localePath(code), "utf8");
    CACHE[code] = JSON.parse(raw);
    return CACHE[code];
  } catch (e) {
    console.warn("[babyeyiDocI18n] load failed:", code, e.message);
    if (code !== "en") return loadLocale("en");
    return { doc: {} };
  }
}

function get(obj, keyPath) {
  return keyPath.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

/**
 * @param {string} lang
 * @param {string} key - dot path e.g. "doc.secFee"
 */
function t(lang, key) {
  const primary = loadLocale(lang);
  const v = get(primary, key);
  if (v != null && v !== "") return v;
  const fb = loadLocale("en");
  const fbv = get(fb, key);
  return fbv != null ? fbv : key;
}

/**
 * @param {string} lang
 * @returns {Record<string, string>} flat doc.* keys for PDFKit
 */
function getDocStrings(lang) {
  const doc = loadLocale(lang).doc || {};
  const enDoc = loadLocale("en").doc || {};
  const out = {};
  const keys = new Set([...Object.keys(enDoc), ...Object.keys(doc)]);
  for (const k of keys) {
    const v = doc[k] != null && doc[k] !== "" ? doc[k] : enDoc[k];
    if (v != null) out[k] = v;
  }
  return out;
}

module.exports = { t, getDocStrings, loadLocale };
