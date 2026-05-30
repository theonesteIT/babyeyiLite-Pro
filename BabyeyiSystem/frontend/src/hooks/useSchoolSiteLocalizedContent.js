import { useEffect, useState } from 'react';
import { normalizeBabyeyiLang } from '../manager/schoolLiteSupport/babyeyiTranslateLangs.js';
import { translateSchoolSiteContent } from '../babyeyiPublic/schoolSiteContentTranslate.js';

/**
 * Localized school mini-site payload: English as stored; rw/fr via Lingva (Babyeyi pattern).
 */
export function useSchoolSiteLocalizedContent(rawData, lang, slug) {
  const lc = normalizeBabyeyiLang(lang);
  const [viewData, setViewData] = useState(rawData);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!rawData) {
      setViewData(null);
      setBusy(false);
      return;
    }

    if (lc === 'en') {
      setViewData(rawData);
      setBusy(false);
      return;
    }

    let cancelled = false;
    setViewData(rawData);
    setBusy(true);

    translateSchoolSiteContent(rawData, lc, slug)
      .then((translated) => {
        if (!cancelled) {
          setViewData(translated);
          setBusy(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setViewData(rawData);
          setBusy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rawData, lc, slug]);

  return { data: viewData ?? rawData, busy };
}
