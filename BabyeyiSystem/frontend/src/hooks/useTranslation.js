import { useMemo } from "react";
import { createTranslator } from "../i18n";

/**
 * @param {string} lang - "en" | "rw" | "fr"
 * @returns {{ t: (key: string) => string, lang: string }}
 */
export function useTranslation(lang) {
  const code = ["en", "rw", "fr"].includes(lang) ? lang : "en";
  const t = useMemo(() => createTranslator(code), [code]);
  return { t, lang: code };
}
