/**
 * Machine-translate school mini-website manager content (en → rw | fr),
 * matching Babyeyi document field translation (Lingva, English source).
 */
import { translateLongText, translateWithLingvaCached } from './lingvaTranslate.js';
import { normalizeBabyeyiLang } from '../manager/schoolLiteSupport/babyeyiTranslateLangs.js';

const SOURCE_LANG = 'en';
const MT_CACHE_PREFIX = 'school_site_mt_v1:';

export async function safeTranslateString(text, source, target) {
  const s = String(text ?? '').trim();
  if (!s) return text;
  try {
    return await translateWithLingvaCached(s, source, target);
  } catch {
    return text;
  }
}

export async function safeTranslateLong(text, source, target) {
  const s = String(text ?? '').trim();
  if (!s) return '';
  try {
    return await translateLongText(s, source, target);
  } catch {
    return s;
  }
}

function cacheKey(slug, lang, data) {
  const id = data?.id ?? data?.slug ?? slug ?? '';
  const stamp = [
    data?.mission,
    data?.vision,
    data?.tagline,
    (data?.coreValues || []).join('|'),
  ].join('§').slice(0, 400);
  return `${MT_CACHE_PREFIX}${id}:${lang}:${stamp}`;
}

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {}
  return null;
}

function writeCache(key, obj) {
  try {
    sessionStorage.setItem(key, JSON.stringify(obj));
  } catch {}
}

async function translateStringArray(arr, source, target) {
  if (!Array.isArray(arr)) return arr;
  return Promise.all(
    arr.map(async (v) => {
      if (typeof v !== 'string' || !v.trim()) return v;
      return safeTranslateString(v, source, target);
    })
  );
}

/**
 * Deep-clone school public payload and translate user-authored strings.
 * Assumes canonical English in the database (same as Babyeyi fee documents).
 */
export async function translateSchoolSiteContent(data, targetLang, slug = '') {
  const lang = normalizeBabyeyiLang(targetLang);
  if (!data || lang === SOURCE_LANG) return data;

  const ck = cacheKey(slug, lang, data);
  const cached = readCache(ck);
  if (cached) return cached;

  const clone = JSON.parse(JSON.stringify(data));
  const tasks = [];

  const queueString = (obj, key, long = false) => {
    if (!obj || typeof obj[key] !== 'string' || !obj[key].trim()) return;
    const original = obj[key];
    tasks.push(
      (async () => {
        obj[key] = long
          ? await safeTranslateLong(original, SOURCE_LANG, lang)
          : await safeTranslateString(original, SOURCE_LANG, lang);
      })()
    );
  };

  queueString(clone, 'mission', true);
  queueString(clone, 'vision', true);
  queueString(clone, 'background', true);
  queueString(clone, 'tagline');
  queueString(clone, 'ownership');
  queueString(clone, 'category');
  queueString(clone, 'name');
  queueString(clone, 'schoolName');

  if (Array.isArray(clone.coreValues)) {
    tasks.push(
      (async () => {
        clone.coreValues = await translateStringArray(clone.coreValues, SOURCE_LANG, lang);
      })()
    );
  }

  if (Array.isArray(clone.tvetTrades)) {
    tasks.push(
      (async () => {
        clone.tvetTrades = await translateStringArray(clone.tvetTrades, SOURCE_LANG, lang);
      })()
    );
  }

  if (Array.isArray(clone.leaders)) {
    clone.leaders.forEach((leader) => {
      queueString(leader, 'name');
      queueString(leader, 'role');
      queueString(leader, 'position');
      queueString(leader, 'title');
      queueString(leader, 'department');
      queueString(leader, 'bio', true);
      queueString(leader, 'message', true);
    });
  }

  if (Array.isArray(clone.newsItems)) {
    clone.newsItems.forEach((item) => {
      queueString(item, 'title');
      queueString(item, 'summary', true);
      queueString(item, 'content', true);
      queueString(item, 'body', true);
      queueString(item, 'excerpt', true);
      queueString(item, 'category');
      queueString(item, 'socialLabel');
    });
  }

  if (Array.isArray(clone.albums)) {
    clone.albums.forEach((album) => {
      queueString(album, 'title');
      queueString(album, 'description', true);
      queueString(album, 'category');
    });
  }

  if (Array.isArray(clone.aLevelCombos)) {
    clone.aLevelCombos.forEach((combo) => {
      if (typeof combo === 'string') return;
      if (combo && typeof combo === 'object') queueString(combo, 'full', true);
    });
  }

  if (clone.admission && typeof clone.admission === 'object') {
    Object.keys(clone.admission).forEach((k) => {
      const val = clone.admission[k];
      if (typeof val === 'string') queueString(clone.admission, k, val.length > 120);
      if (Array.isArray(val)) {
        tasks.push(
          (async () => {
            clone.admission[k] = await translateStringArray(val, SOURCE_LANG, lang);
          })()
        );
      }
    });
  }

  if (clone.fees && typeof clone.fees === 'object') {
    Object.values(clone.fees).forEach((level) => {
      if (!level || typeof level !== 'object') return;
      queueString(level, 'label');
      queueString(level, 'notes', true);
      if (!Array.isArray(level.items)) return;
      level.items.forEach((it) => {
        queueString(it, 'name');
        queueString(it, 'label');
        queueString(it, 'type');
        queueString(it, 'description', true);
      });
    });
  }

  await Promise.all(tasks);
  writeCache(ck, clone);
  return clone;
}

/** Translate admission form title + question labels (English source). */
export async function translateAdmissionForm(form, targetLang) {
  const lang = normalizeBabyeyiLang(targetLang);
  if (!form || lang === SOURCE_LANG) return form;

  const clone = JSON.parse(JSON.stringify(form));
  if (clone.title?.trim()) {
    clone.title = await safeTranslateString(clone.title, SOURCE_LANG, lang);
  }
  if (clone.description?.trim()) {
    clone.description = await safeTranslateLong(clone.description, SOURCE_LANG, lang);
  }
  if (Array.isArray(clone.questions)) {
    clone.questions = await Promise.all(
      clone.questions.map(async (q) => {
        const next = { ...q };
        if (next.label?.trim()) {
          next.label = await safeTranslateString(String(next.label), SOURCE_LANG, lang);
        }
        if (next.helpText?.trim()) {
          next.helpText = await safeTranslateString(String(next.helpText), SOURCE_LANG, lang);
        }
        if (Array.isArray(next.options)) {
          next.options = await translateStringArray(next.options, SOURCE_LANG, lang);
        }
        return next;
      })
    );
  }
  return clone;
}
