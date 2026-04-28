/**
 * Babyeyi EN / RW / FR translation bundle for school fee documents.
 *
 * FREE stack (no Google Cloud billing):
 *   1) MyMemory Translation API — https://mymemory.translated.net/doc/spec.php
 *      No API key; optional MYMEMORY_CONTACT_EMAIL raises the free daily quota.
 *   2) Optional LibreTranslate (self-hosted or public URL) via LIBRETRANSLATE_URL.
 *
 * Env:
 *   BABYEYI_TRANSLATE_ENGINE=mymemory | libretranslate | auto  (default: mymemory)
 *   MYMEMORY_CONTACT_EMAIL=you@domain.com   (optional, higher free quota)
 *   LIBRETRANSLATE_URL=https://libretranslate.example.com
 *   LIBRETRANSLATE_API_KEY=                 (only if your instance requires it)
 *   BABYEYI_TRANSLATE_DELAY_MS=120          (politeness delay between MyMemory calls)
 *
 * Leader names are never translated (copied as-is); roles and fee text are translated.
 *
 * Student requirement rows (catalog item + description) are NOT translated — they keep
 * the default names from the system in every language view.
 */

const axios = require("axios");

const TARGETS = ["en", "rw", "fr"];

function normalizeSourceLang(raw) {
  const s = String(raw || "en").trim().toLowerCase();
  if (s.startsWith("rw")) return "rw";
  if (s.startsWith("fr")) return "fr";
  return "en";
}

function decodeEntities(s) {
  if (!s || typeof s !== "string") return s;
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * MyMemory: free GET API, ~1k words/day without email; more with &de=email
 */
async function myMemoryTranslateChunk(text, source, target) {
  const langpair = `${source}|${target}`;
  const params = { q: text, langpair };
  const email = process.env.MYMEMORY_CONTACT_EMAIL;
  if (email) params.de = email;

  const { data } = await axios.get("https://api.mymemory.translated.net/get", {
    params,
    timeout: 60000,
    validateStatus: () => true,
  });

  if (data?.responseStatus !== 200) {
    throw new Error(data?.responseDetails || "MyMemory error");
  }
  const tr = data?.responseData?.translatedText;
  if (tr == null) throw new Error("MyMemory empty response");
  return decodeEntities(tr);
}

/** MyMemory URL length limits — chunk long parent messages */
async function myMemoryTranslate(text, source, target) {
  const s = String(text ?? "");
  if (!s.trim()) return s;
  const chunkSize = Number(process.env.MYMEMORY_CHUNK_CHARS || 450);
  if (s.length <= chunkSize) return await myMemoryTranslateChunk(s, source, target);

  const parts = [];
  for (let i = 0; i < s.length; i += chunkSize) {
    const chunk = s.slice(i, i + chunkSize);
    parts.push(await myMemoryTranslateChunk(chunk, source, target));
    await sleep(Number(process.env.BABYEYI_TRANSLATE_DELAY_MS || 120));
  }
  return parts.join("");
}

async function libreTranslateOne(text, source, target, baseUrl, apiKey) {
  const url = `${baseUrl.replace(/\/$/, "")}/translate`;
  const body = { q: text, source, target, format: "text" };
  if (apiKey) body.api_key = apiKey;
  const { data } = await axios.post(url, body, {
    timeout: 90000,
    headers: { "Content-Type": "application/json" },
    validateStatus: () => true,
  });
  if (data?.error) throw new Error(data.error);
  const tr = data?.translatedText;
  if (tr == null) throw new Error("LibreTranslate empty");
  return decodeEntities(tr);
}

/**
 * One string: MyMemory first (zero config), optional LibreTranslate.
 */
async function translateOneFree(text, source, target) {
  if (source === target) return text;
  const s = String(text ?? "");
  if (!s.trim()) return s;

  const engine = (process.env.BABYEYI_TRANSLATE_ENGINE || "mymemory").toLowerCase();
  const libreBase = process.env.LIBRETRANSLATE_URL || "https://libretranslate.com";
  const libreKey = process.env.LIBRETRANSLATE_API_KEY || "";

  const tryLibre = async () =>
    libreTranslateOne(s, source, target, libreBase, libreKey);

  if (engine === "libretranslate") {
    try {
      return await tryLibre();
    } catch (e) {
      console.warn("[babyeyiI18n] libretranslate:", e.message);
      try {
        return await myMemoryTranslate(s, source, target);
      } catch (e2) {
        console.warn("[babyeyiI18n] mymemory fallback:", e2.message);
        return s;
      }
    }
  }

  if (engine === "auto") {
    if (process.env.LIBRETRANSLATE_URL) {
      try {
        return await tryLibre();
      } catch (_) {
        /* try mymemory */
      }
    }
    try {
      return await myMemoryTranslate(s, source, target);
    } catch (e) {
      console.warn("[babyeyiI18n] auto mymemory:", e.message);
      try {
        return await tryLibre();
      } catch (e2) {
        console.warn("[babyeyiI18n] auto libre:", e2.message);
        return s;
      }
    }
  }

  // default: mymemory — free, no API key
  try {
    return await myMemoryTranslate(s, source, target);
  } catch (e) {
    console.warn("[babyeyiI18n] mymemory:", e.message);
    try {
      return await tryLibre();
    } catch (e2) {
      console.warn("[babyeyiI18n] libre fallback:", e2.message);
      return s;
    }
  }
}

async function translateBatchFree(texts, target, source) {
  if (!texts.length) return texts;
  if (target === source) return texts.map((t) => (t == null ? "" : String(t)));

  const nonEmpty = texts.map((t) => (t == null ? "" : String(t)));
  const out = new Array(nonEmpty.length);
  const delay = Number(process.env.BABYEYI_TRANSLATE_DELAY_MS || 120);

  for (let i = 0; i < nonEmpty.length; i++) {
    const t = nonEmpty[i];
    if (!t.trim()) {
      out[i] = t;
      continue;
    }
    try {
      out[i] = await translateOneFree(t, source, target);
    } catch (e) {
      console.warn("[babyeyiI18n] batch segment:", e.message);
      out[i] = t;
    }
    if (i < nonEmpty.length - 1) await sleep(delay);
  }
  return out;
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

function structuredToTranslateFlat(s) {
  const flat = [s.parentMessage];
  s.paymentNames.forEach((x) => flat.push(x));
  // Student requirements: excluded — catalog names stay as stored (not translated)
  s.noteItems.forEach((x) => flat.push(x));
  s.noteDetails.forEach((x) => flat.push(x));
  s.otherItems.forEach((x) => flat.push(x));
  s.otherDetails.forEach((x) => flat.push(x));
  s.leaderRoles.forEach((x) => flat.push(x));
  return flat;
}

function flatToStructured(translatedFlat, baseStructured) {
  const c = baseStructured.counts;
  let i = 0;
  const parentMessage = translatedFlat[i++] ?? "";
  const paymentNames = translatedFlat.slice(i, (i += c.payments));
  const reqItems = [...baseStructured.reqItems];
  const reqDescs = [...baseStructured.reqDescs];
  const noteItems = translatedFlat.slice(i, (i += c.notes));
  const noteDetails = translatedFlat.slice(i, (i += c.notes));
  const otherItems = translatedFlat.slice(i, (i += c.others));
  const otherDetails = translatedFlat.slice(i, (i += c.others));
  const leaderRoles = translatedFlat.slice(i, (i += c.leaders));
  return {
    parentMessage,
    paymentNames,
    reqItems,
    reqDescs,
    noteItems,
    noteDetails,
    otherItems,
    otherDetails,
    leaderNames: [...baseStructured.leaderNames],
    leaderRoles,
    counts: { ...baseStructured.counts },
  };
}

async function translateStructuredPack(baseStructured, source, target) {
  if (target === source) {
    return {
      ...baseStructured,
      leaderNames: [...baseStructured.leaderNames],
    };
  }

  const flat = structuredToTranslateFlat(baseStructured);
  const translated = await translateBatchFree(flat, target, source);
  if (translated.length !== flat.length) {
    console.warn("[babyeyiI18n] translate length mismatch, using source");
    return { ...baseStructured, leaderNames: [...baseStructured.leaderNames] };
  }
  const merged = flatToStructured(translated, baseStructured);
  merged.leaderNames = [...baseStructured.leaderNames];
  return merged;
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

function resolveEngineLabel() {
  const e = (process.env.BABYEYI_TRANSLATE_ENGINE || "mymemory").toLowerCase();
  if (e === "libretranslate") return "libretranslate";
  if (e === "auto") return "auto(mymemory+libre)";
  return "mymemory";
}

/**
 * Build full bundle { v, source, generatedAt, freeTier, translationEngine, en, rw, fr }.
 */
async function buildBabyeyiTranslationBundle(ctx) {
  const source = normalizeSourceLang(ctx.sourceLang);
  const base = extractStructured(ctx);

  const bundle = {
    v: 1,
    source,
    generatedAt: new Date().toISOString(),
    freeTier: true,
    translationEngine: resolveEngineLabel(),
    en: null,
    rw: null,
    fr: null,
  };

  for (const target of TARGETS) {
    if (target === source) {
      bundle[target] = mirrorPack(base);
    } else {
      try {
        bundle[target] = await translateStructuredPack(base, source, target);
      } catch (e) {
        console.warn("[babyeyiI18n] translate failed → mirror", target, e.message);
        bundle[target] = mirrorPack(base);
        bundle.translationEngine = "mirror";
      }
    }
  }

  return bundle;
}

function applyTranslationBundle(rec, bundle, lang) {
  if (!bundle || !bundle.v || !rec) return rec;
  const code = TARGETS.includes(lang) ? lang : "en";
  const pack = bundle[code];
  if (!pack) return rec;

  const pay = (rec.payments || []).map((p, i) => ({
    ...p,
    name: pack.paymentNames[i] != null && pack.paymentNames[i] !== "" ? pack.paymentNames[i] : p.name,
  }));

  const requirements = rec.requirements || [];

  const classNotesRaw = rec.classNotes || [];
  const otherInfosRaw = rec.otherInfos || [];
  const nNotes = pack.counts.notes;
  const nOthers = pack.counts.others;

  const classNotes = classNotesRaw.map((n, i) =>
    i < nNotes
      ? {
          ...n,
          item: pack.noteItems[i] != null ? pack.noteItems[i] : n.item,
          details: pack.noteDetails[i] != null ? pack.noteDetails[i] : n.details,
        }
      : n
  );

  const otherInfos = otherInfosRaw.map((o, i) =>
    i < nOthers
      ? {
          ...o,
          item: pack.otherItems[i] != null ? pack.otherItems[i] : o.item,
          details: pack.otherDetails[i] != null ? pack.otherDetails[i] : o.details,
        }
      : o
  );

  const leaders = (rec.leaders || []).map((l, i) => ({
    ...l,
    name: pack.leaderNames[i] != null && pack.leaderNames[i] !== "" ? pack.leaderNames[i] : l.name,
    role: pack.leaderRoles[i] != null && pack.leaderRoles[i] !== "" ? pack.leaderRoles[i] : l.role,
  }));

  return {
    ...rec,
    parentMessage: pack.parentMessage || rec.parentMessage,
    payments: pay,
    requirements,
    classNotes,
    otherInfos,
    leaders,
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
