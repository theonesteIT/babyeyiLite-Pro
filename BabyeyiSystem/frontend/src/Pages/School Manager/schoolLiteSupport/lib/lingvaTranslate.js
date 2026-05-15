/**
 * Client-side machine translation via Lingva (free, open-source Google Translate frontend).
 * Uses multiple public instances as fallbacks if one is slow or unavailable.
 * @see https://github.com/thedaviddelta/lingva-translate
 */

const DEFAULT_LINGVA_BASES = [
  "https://lingva.ml",
  "https://translate.plausibility.cloud",
  "https://lingva.garudalinux.org",
];

/** Optional: `VITE_LINGVA_BASES=https://your-proxy/api/lingva,https://lingva.ml` (comma-separated, no trailing slash). */
function parseLingvaBasesFromEnv() {
  try {
    const raw = typeof import.meta !== "undefined" && import.meta.env?.VITE_LINGVA_BASES;
    const s = String(raw ?? "").trim();
    if (!s) return null;
    const parts = s.split(",").map((x) => x.trim().replace(/\/+$/, "")).filter(Boolean);
    return parts.length ? parts : null;
  } catch {
    return null;
  }
}

const LINGVA_BASES = parseLingvaBasesFromEnv() ?? DEFAULT_LINGVA_BASES;

const memoryCache = new Map();

function cacheKey(source, target, text) {
  return `${source}|${target}|${text}`;
}

/**
 * Keep URL path segment within safe limits (GET requests).
 */
const MAX_SEGMENT_CHARS = 1100;

async function fetchWithTimeout(url, ms = 22000) {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { signal: ac.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * @param {string} text
 * @param {string} source ISO 639-1 (e.g. "en")
 * @param {string} target ISO 639-1
 */
export async function translateWithLingva(text, source, target) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return "";
  if (source === target) return text;

  let lastErr;
  for (const base of LINGVA_BASES) {
    try {
      const slice = trimmed.slice(0, MAX_SEGMENT_CHARS);
      const q = encodeURIComponent(slice);
      const url = `${base}/api/v1/${encodeURIComponent(source)}/${encodeURIComponent(target)}/${q}`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const out = json?.translation;
      if (typeof out === "string" && out.length) return out;
      return text;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Translation failed");
}

export async function translateWithLingvaCached(text, source, target) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return text;
  if (source === target) return text;
  const ck = cacheKey(source, target, trimmed);
  if (memoryCache.has(ck)) return memoryCache.get(ck);
  const out = await translateWithLingva(trimmed, source, target);
  memoryCache.set(ck, out);
  return out;
}

/** Long paragraphs: split so each GET stays under URL limits, run chunks in parallel. */
export async function translateLongText(text, source, target) {
  const t = String(text ?? "").trim();
  if (!t) return "";
  if (t.length <= MAX_SEGMENT_CHARS) return translateWithLingvaCached(t, source, target);
  if (t.includes("\n\n")) {
    const blocks = t.split(/\n\n+/).filter(Boolean);
    const batch = 8;
    const out = [];
    for (let i = 0; i < blocks.length; i += batch) {
      const slice = blocks.slice(i, i + batch);
      const tr = await Promise.all(slice.map((p) => translateWithLingvaCached(p.trim().slice(0, MAX_SEGMENT_CHARS), source, target)));
      out.push(...tr);
    }
    return out.join("\n\n");
  }
  const chunks = [];
  for (let i = 0; i < t.length; i += 900) chunks.push(t.slice(i, i + 900));
  const batch = 8;
  const out = [];
  for (let i = 0; i < chunks.length; i += batch) {
    const slice = chunks.slice(i, i + batch);
    const tr = await Promise.all(slice.map((p) => translateWithLingvaCached(p, source, target)));
    out.push(...tr);
  }
  return out.join("");
}

/**
 * Translates all string values in a flat record, deduplicating identical strings.
 */
export async function translateFlatUiRecord(record, source, target) {
  const out = { ...record };
  const keysByValue = new Map();
  for (const [k, v] of Object.entries(record)) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (!t) continue;
    if (!keysByValue.has(t)) keysByValue.set(t, []);
    keysByValue.get(t).push(k);
  }
  const unique = [...keysByValue.keys()];
  if (unique.length === 0) return out;

  let successes = 0;
  let failures = 0;
  const batchSize = 14;
  for (let i = 0; i < unique.length; i += batchSize) {
    const slice = unique.slice(i, i + batchSize);
    await Promise.all(
      slice.map(async (original) => {
        let translated = original;
        try {
          translated =
            original.length > MAX_SEGMENT_CHARS
              ? await translateLongText(original, source, target)
              : await translateWithLingvaCached(original, source, target);
          successes++;
        } catch {
          failures++;
          /* keep original English */
        }
        for (const key of keysByValue.get(original)) {
          out[key] = translated;
        }
      })
    );
  }
  if (successes === 0 && failures > 0) {
    throw new Error(
      "Machine translation could not reach any Lingva server (network, firewall, or ad blocker). " +
        "English, Kinyarwanda, and Français still work offline. " +
        "Optional: set VITE_LINGVA_BASES to your own comma-separated Lingva-compatible base URL(s)."
    );
  }
  return out;
}
