/**
 * Pluggable translation: English → Kinyarwanda / French for persisted Babyeyi content.
 *
 * MyMemory free API often fails for en→rw (quota, or returns English / warning text).
 * We validate output and fall back to LibreTranslate (public instance or self-hosted).
 *
 * Env:
 *   BABYEYI_TRANSLATION_PROVIDER=mymemory|noop
 *   BABYEYI_TRANSLATION_ENABLED=0  — skip external APIs; rw/fr copy English (noop)
 *   LIBRETRANSLATE_URL=https://libretranslate.com/translate  (optional override)
 *   LIBRETRANSLATE_API_KEY=optional
 */

const axios = require("axios");

const PROVIDER = String(process.env.BABYEYI_TRANSLATION_PROVIDER || "mymemory").toLowerCase();
const ENABLED = process.env.BABYEYI_TRANSLATION_ENABLED !== "0";
const LIBRE_URL = String(process.env.LIBRETRANSLATE_URL || "https://libretranslate.com/translate").replace(/\/$/, "");
const LIBRE_KEY = process.env.LIBRETRANSLATE_API_KEY || "";

const MYMEMORY = "https://api.mymemory.translated.net/get";

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldSkipTranslation(text) {
  const t = String(text ?? "").trim();
  if (!t) return true;
  if (t.length <= 2) return true;
  if (/^[\d\s.,:;+\-–—/\\RWFfrw]+$/i.test(t)) return true;
  if (/^BY-\d{4}-\d{5}$/i.test(t)) return true;
  if (/^\S+@\S+\.\S+$/.test(t)) return true;
  if (/^\+?[\d\s\-()]{8,}$/.test(t)) return true;
  if (/^\d[\d\s\-]{6,}$/.test(t)) return true;
  return false;
}

function chunkText(s, maxLen = 450) {
  const t = String(s);
  if (t.length <= maxLen) return [t];
  const parts = [];
  let i = 0;
  while (i < t.length) {
    let end = Math.min(i + maxLen, t.length);
    if (end < t.length) {
      const cut = t.lastIndexOf("\n", end);
      const cut2 = t.lastIndexOf(" ", end);
      const best = Math.max(cut, cut2);
      if (best > i + 40) end = best + 1;
    }
    parts.push(t.slice(i, end).trim());
    i = end;
  }
  return parts.filter(Boolean);
}

/** MyMemory / bad MT often returns this instead of real translation. */
function isGarbageTranslation(source, translated, targetLang) {
  const src = String(source ?? "").trim();
  const out = String(translated ?? "").trim();
  if (!out) return true;
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID\s+LANGUAGE|USAGE\s+LIMIT/i.test(out)) return true;
  if (src.length > 12 && out.toLowerCase() === src.toLowerCase() && targetLang !== "en") {
    return true;
  }
  return false;
}

async function translateMyMemorySegment(text, langPair) {
  const q = encodeURIComponent(text);
  const url = `${MYMEMORY}?q=${q}&langpair=${langPair}`;
  const { data } = await axios.get(url, { timeout: 25_000 });
  if (data?.quotaFinished || data?.responseStatus === 429) {
    throw new Error("MyMemory quota exceeded");
  }
  const status = data?.responseStatus;
  if (status != null && Number(status) >= 400) {
    throw new Error(`MyMemory status ${status}`);
  }
  const out = data?.responseData?.translatedText;
  if (typeof out !== "string" || !out.trim()) {
    throw new Error("MyMemory empty response");
  }
  return out.trim();
}

async function translateWithMyMemory(text, from, to) {
  if (shouldSkipTranslation(text)) return String(text);
  const langPair = `${from}|${to}`;
  const chunks = chunkText(String(text));
  const pieces = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i) await delay(100);
    pieces.push(await translateMyMemorySegment(chunks[i], langPair));
  }
  return pieces.join("\n\n");
}

async function translateWithLibreTranslate(text, source, target) {
  if (shouldSkipTranslation(text)) return String(text);
  const body = {
    q: String(text),
    source: source.slice(0, 2),
    target: target.slice(0, 2),
    format: "text",
  };
  if (LIBRE_KEY) body.api_key = LIBRE_KEY;
  const { data } = await axios.post(LIBRE_URL, body, {
    timeout: 30_000,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    validateStatus: (s) => s < 500,
  });
  if (data?.error) throw new Error(String(data.error));
  const out = data?.translatedText;
  if (typeof out !== "string" || !out.trim()) throw new Error("LibreTranslate empty");
  return out.trim();
}

/**
 * Try MyMemory, then LibreTranslate if output looks wrong or MyMemory throws.
 */
async function translateViaProviders(text, from, to) {
  const f = String(from || "en").toLowerCase().slice(0, 2);
  const t = String(to || "en").toLowerCase().slice(0, 2);
  if (f === t) return String(text ?? "");
  if (!ENABLED || PROVIDER === "noop") {
    return String(text ?? "");
  }

  let primary = "";
  if (PROVIDER === "mymemory") {
    try {
      primary = await translateWithMyMemory(text, f, t);
    } catch (e) {
      console.warn("[babyeyiContentTranslator] MyMemory:", e.message?.slice(0, 120));
      primary = "";
    }
    if (!isGarbageTranslation(text, primary, t)) {
      return primary;
    }
  }

  try {
    const secondary = await translateWithLibreTranslate(text, f, t);
    if (!isGarbageTranslation(text, secondary, t)) {
      return secondary;
    }
  } catch (e) {
    console.warn("[babyeyiContentTranslator] LibreTranslate:", e.message?.slice(0, 120));
  }

  if (primary && String(primary).trim()) return primary;
  return String(text ?? "");
}

async function translateText(text, from, to) {
  return translateViaProviders(text, from, to);
}

/**
 * Build { en, rw, fr } — rw and fr translated in parallel for speed.
 */
async function translateFieldToRwFr(englishText, onError) {
  const en = String(englishText ?? "").trim();
  const empty = { en: englishText ?? "", rw: "", fr: "" };
  if (!en) return empty;

  let rw = "";
  let fr = "";
  try {
    [rw, fr] = await Promise.all([
      translateText(en, "en", "rw").catch((e) => {
        if (onError) onError("rw", e);
        return "";
      }),
      translateText(en, "en", "fr").catch((e) => {
        if (onError) onError("fr", e);
        return "";
      }),
    ]);
  } catch (e) {
    if (onError) onError("parallel", e);
  }

  if (PROVIDER === "noop" || !ENABLED) {
    rw = en;
    fr = en;
  }

  return {
    en: englishText ?? "",
    rw: rw || "",
    fr: fr || "",
  };
}

module.exports = {
  shouldSkipTranslation,
  translateText,
  translateFieldToRwFr,
  PROVIDER,
  ENABLED,
};
