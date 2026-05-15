import { useEffect, useMemo, useState } from "react";
import { getLegacyBabyeyiUI } from "../i18n/index.js";
import { translateFlatUiRecord } from "../lib/lingvaTranslate.js";
import { isCoreBabyeyiLang, normalizeBabyeyiLang } from "../babyeyiTranslateLangs.js";

const MT_CACHE_PREFIX = "babyeyi_mt_ui_v3:";

function readMtCache(lang) {
  try {
    const raw = sessionStorage.getItem(MT_CACHE_PREFIX + lang);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data === "object") return data;
  } catch {}
  return null;
}

function writeMtCache(lang, obj) {
  try {
    sessionStorage.setItem(MT_CACHE_PREFIX + lang, JSON.stringify(obj));
  } catch {}
}

/**
 * Resolves Babyeyi list / document UI strings: official en/rw/fr from JSON,
 * any other language via free Lingva machine translation (memory + session cache).
 *
 * Core locales never reuse mtT so switching back from a machine-translated language
 * cannot leave Russian (etc.) labels stuck on screen.
 */
export function useBabyeyiUiT(lang) {
  const lc = useMemo(() => normalizeBabyeyiLang(lang), [lang]);

  const baseEn = useMemo(() => getLegacyBabyeyiUI("en"), []);
  const staticT = useMemo(
    () => (isCoreBabyeyiLang(lc) ? getLegacyBabyeyiUI(lc) : null),
    [lc]
  );
  const apiLang = useMemo(() => (isCoreBabyeyiLang(lc) ? lc : "en"), [lc]);

  const [mtT, setMtT] = useState(() =>
    !isCoreBabyeyiLang(normalizeBabyeyiLang(lang)) ? readMtCache(normalizeBabyeyiLang(lang)) : null
  );
  const [mtLoading, setMtLoading] = useState(
    () => !isCoreBabyeyiLang(normalizeBabyeyiLang(lang)) && !readMtCache(normalizeBabyeyiLang(lang))
  );
  const [mtError, setMtError] = useState(null);

  useEffect(() => {
    if (isCoreBabyeyiLang(lc)) {
      setMtT(null);
      setMtLoading(false);
      setMtError(null);
      return;
    }
    const cached = readMtCache(lc);
    if (cached) {
      setMtT(cached);
      setMtLoading(false);
      setMtError(null);
      return;
    }
    let cancelled = false;
    setMtLoading(true);
    setMtError(null);
    setMtT(null);
    translateFlatUiRecord(baseEn, "en", lc)
      .then((tr) => {
        if (!cancelled) {
          writeMtCache(lc, tr);
          setMtT(tr);
          setMtLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setMtError(e?.message || "Translation failed");
          setMtLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lc, baseEn]);

  const T = useMemo(() => {
    if (isCoreBabyeyiLang(lc)) {
      return staticT ?? baseEn;
    }
    return mtT ?? baseEn;
  }, [lc, staticT, mtT, baseEn]);

  const machineActive = !isCoreBabyeyiLang(lc);

  return { T, apiLang, mtLoading, mtError, machineActive };
}
