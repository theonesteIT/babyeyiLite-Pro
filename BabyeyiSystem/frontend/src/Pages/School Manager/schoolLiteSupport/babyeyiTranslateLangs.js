/** Locales with hand-maintained JSON (fast, offline). */
export const CORE_BABYEYI_LANG_CODES = new Set(["en", "rw", "fr"]);

/**
 * Normalize language codes from localStorage / UI (case, region, common aliases).
 * Ensures en | rw | fr match JSON locales and 2-letter codes match Lingva.
 */
export function normalizeBabyeyiLang(code) {
  const raw = String(code ?? "en").trim().toLowerCase();
  if (!raw) return "en";
  if (raw === "en" || raw === "english") return "en";
  if (raw === "rw" || raw === "kin" || raw.startsWith("rw-")) return "rw";
  if (raw === "fr" || raw === "fra" || raw.startsWith("fr-")) return "fr";
  const region = raw.match(/^([a-z]{2})-/);
  if (region) return region[1];
  if (/^[a-z]{2}$/.test(raw)) return raw;
  return raw.length >= 2 ? raw.slice(0, 2) : "en";
}

export function isCoreBabyeyiLang(code) {
  return CORE_BABYEYI_LANG_CODES.has(normalizeBabyeyiLang(code));
}

/** Hand-maintained locales (JSON bundles) — flags for language picker UI. */
export const CORE_BABYEYI_LANG_OPTIONS = [
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "rw", flag: "🇷🇼", name: "Kinyarwanda" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
];

/**
 * Extra UI languages via Lingva (instant machine translation from English strings).
 * Codes are ISO 639-1 where Lingva supports them.
 */
export const BABYEYI_AUTO_LANG_OPTIONS = [
  { code: "sw", flag: "🇸🇿", name: "Swahili" },
  { code: "lg", flag: "🇺🇬", name: "Luganda" },
  { code: "ln", flag: "🇨🇩", name: "Lingala" },
  { code: "am", flag: "🇪🇹", name: "Amharic" },
  { code: "so", flag: "🇸🇴", name: "Somali" },
  { code: "zu", flag: "🇿🇦", name: "Zulu" },
  { code: "af", flag: "🇿🇦", name: "Afrikaans" },
  { code: "ar", flag: "🇸🇦", name: "Arabic" },
  { code: "zh", flag: "🇨🇳", name: "Chinese" },
  { code: "hi", flag: "🇮🇳", name: "Hindi" },
  { code: "bn", flag: "🇧🇩", name: "Bengali" },
  { code: "ur", flag: "🇵🇰", name: "Urdu" },
  { code: "fa", flag: "🇮🇷", name: "Persian" },
  { code: "tr", flag: "🇹🇷", name: "Turkish" },
  { code: "ru", flag: "🇷🇺", name: "Russian" },
  { code: "uk", flag: "🇺🇦", name: "Ukrainian" },
  { code: "pl", flag: "🇵🇱", name: "Polish" },
  { code: "de", flag: "🇩🇪", name: "German" },
  { code: "nl", flag: "🇳🇱", name: "Dutch" },
  { code: "es", flag: "🇪🇸", name: "Spanish" },
  { code: "pt", flag: "🇵🇹", name: "Portuguese" },
  { code: "it", flag: "🇮🇹", name: "Italian" },
  { code: "el", flag: "🇬🇷", name: "Greek" },
  { code: "sv", flag: "🇸🇪", name: "Swedish" },
  { code: "no", flag: "🇳🇴", name: "Norwegian" },
  { code: "da", flag: "🇩🇰", name: "Danish" },
  { code: "fi", flag: "🇫🇮", name: "Finnish" },
  { code: "cs", flag: "🇨🇿", name: "Czech" },
  { code: "ro", flag: "🇷🇴", name: "Romanian" },
  { code: "hu", flag: "🇭🇺", name: "Hungarian" },
  { code: "he", flag: "🇮🇱", name: "Hebrew" },
  { code: "ja", flag: "🇯🇵", name: "Japanese" },
  { code: "ko", flag: "🇰🇷", name: "Korean" },
  { code: "vi", flag: "🇻🇳", name: "Vietnamese" },
  { code: "th", flag: "🇹🇭", name: "Thai" },
  { code: "id", flag: "🇮🇩", name: "Indonesian" },
  { code: "ms", flag: "🇲🇾", name: "Malay" },
  { code: "tl", flag: "🇵🇭", name: "Filipino" },
];
