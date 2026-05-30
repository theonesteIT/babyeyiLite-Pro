/**
 * Server-side translation for published school mini-website payloads.
 * Uses the same provider stack as Babyeyi documents (MyMemory → LibreTranslate).
 */
const { translateText, shouldSkipTranslation } = require('./babyeyiContentTranslator');

const SOURCE_LANG = 'en';
const MAX_SEGMENT_CHARS = 450;

function normalizeLang(raw) {
  const s = String(raw || 'en').trim().toLowerCase();
  if (s.startsWith('rw')) return 'rw';
  if (s.startsWith('fr')) return 'fr';
  return 'en';
}

async function safeTranslateString(text, source, target) {
  const s = String(text ?? '').trim();
  if (!s || shouldSkipTranslation(s)) return text;
  try {
    return await translateText(s, source, target);
  } catch {
    return text;
  }
}

async function safeTranslateLong(text, source, target) {
  const s = String(text ?? '').trim();
  if (!s) return '';
  if (s.length <= MAX_SEGMENT_CHARS) return safeTranslateString(s, source, target);

  if (s.includes('\n\n')) {
    const blocks = s.split(/\n\n+/).filter(Boolean);
    const out = [];
    for (const block of blocks) {
      out.push(await safeTranslateString(block.trim().slice(0, MAX_SEGMENT_CHARS), source, target));
    }
    return out.join('\n\n');
  }

  const chunks = [];
  for (let i = 0; i < s.length; i += 900) chunks.push(s.slice(i, i + 900));
  const out = [];
  for (const chunk of chunks) {
    out.push(await safeTranslateString(chunk, source, target));
  }
  return out.join('');
}

async function translateStringArray(arr, source, target) {
  if (!Array.isArray(arr)) return arr;
  const out = [];
  for (const v of arr) {
    if (typeof v !== 'string' || !v.trim()) {
      out.push(v);
      continue;
    }
    out.push(await safeTranslateString(v, source, target));
  }
  return out;
}

/**
 * Deep-clone school public payload and translate user-authored strings.
 */
async function translateSchoolSiteContent(data, targetLang) {
  const lang = normalizeLang(targetLang);
  if (!data || lang === SOURCE_LANG) return data;

  const clone = JSON.parse(JSON.stringify(data));

  const setString = async (obj, key, long = false) => {
    if (!obj || typeof obj[key] !== 'string' || !obj[key].trim()) return;
    obj[key] = long
      ? await safeTranslateLong(obj[key], SOURCE_LANG, lang)
      : await safeTranslateString(obj[key], SOURCE_LANG, lang);
  };

  await setString(clone, 'mission', true);
  await setString(clone, 'vision', true);
  await setString(clone, 'background', true);
  await setString(clone, 'tagline');
  await setString(clone, 'ownership');
  await setString(clone, 'category');
  await setString(clone, 'name');
  await setString(clone, 'schoolName');

  if (Array.isArray(clone.coreValues)) {
    clone.coreValues = await translateStringArray(clone.coreValues, SOURCE_LANG, lang);
  }

  if (Array.isArray(clone.tvetTrades)) {
    clone.tvetTrades = await translateStringArray(clone.tvetTrades, SOURCE_LANG, lang);
  }

  if (Array.isArray(clone.leaders)) {
    for (const leader of clone.leaders) {
      await setString(leader, 'name');
      await setString(leader, 'role');
      await setString(leader, 'position');
      await setString(leader, 'title');
      await setString(leader, 'department');
      await setString(leader, 'bio', true);
      await setString(leader, 'message', true);
    }
  }

  if (Array.isArray(clone.newsItems)) {
    for (const item of clone.newsItems) {
      await setString(item, 'title');
      await setString(item, 'summary', true);
      await setString(item, 'content', true);
      await setString(item, 'body', true);
      await setString(item, 'excerpt', true);
      await setString(item, 'category');
      await setString(item, 'socialLabel');
    }
  }

  if (Array.isArray(clone.albums)) {
    for (const album of clone.albums) {
      await setString(album, 'title');
      await setString(album, 'description', true);
      await setString(album, 'category');
      if (Array.isArray(album.images)) {
        for (const img of album.images) {
          await setString(img, 'caption');
        }
      }
    }
  }

  if (Array.isArray(clone.aLevelCombos)) {
    for (let i = 0; i < clone.aLevelCombos.length; i++) {
      const combo = clone.aLevelCombos[i];
      if (typeof combo === 'string') {
        clone.aLevelCombos[i] = await safeTranslateString(combo, SOURCE_LANG, lang);
        continue;
      }
      if (combo && typeof combo === 'object') {
        await setString(combo, 'full', true);
        await setString(combo, 'name');
      }
    }
  }

  if (clone.admission && typeof clone.admission === 'object') {
    for (const k of Object.keys(clone.admission)) {
      const val = clone.admission[k];
      if (typeof val === 'string') {
        await setString(clone.admission, k, val.length > 120);
      } else if (Array.isArray(val)) {
        clone.admission[k] = await translateStringArray(val, SOURCE_LANG, lang);
      }
    }
  }

  if (clone.fees && typeof clone.fees === 'object') {
    for (const level of Object.values(clone.fees)) {
      if (!level || typeof level !== 'object') continue;
      await setString(level, 'label');
      await setString(level, 'notes', true);
      if (!Array.isArray(level.items)) continue;
      for (const it of level.items) {
        await setString(it, 'name');
        await setString(it, 'label');
        await setString(it, 'type');
        await setString(it, 'description', true);
        await setString(it, 'period');
      }
    }
  }

  return clone;
}

module.exports = {
  normalizeLang,
  translateSchoolSiteContent,
};
