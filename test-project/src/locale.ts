import messages from "./messages";
import chatLabMessages from "./chatLabMessages";
import chatMessages from "./chatMessages";
import chatRendererMessages from "./chatRendererMessages";

export const languages = {
  en: "English",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  "pt-BR": "Português (Brasil)",
  ru: "Русский",
} as const;
export type Locale = keyof typeof languages;
export type LanguagePreference = Locale | "auto";
export const languageStorageKey = "auto-studio:language";

export function isPreference(value: unknown): value is LanguagePreference {
  return (
    typeof value === "string" &&
    (value === "auto" || Object.hasOwn(languages, value))
  );
}

export function detectLocale(preferences: readonly string[]): Locale {
  for (const preference of preferences) {
    const tag = preference.toLowerCase().replaceAll("_", "-");
    const [base] = tag.split("-");
    if (base === "zh") {
      if (tag.split("-").includes("hans")) return "zh-CN";
      return /(?:^|-)(?:hant|tw|hk|mo)(?:-|$)/.test(tag) ? "zh-TW" : "zh-CN";
    }
    if (base === "pt") return "pt-BR";
    if (Object.hasOwn(languages, base)) return base as Locale;
  }
  return "en";
}

const englishKeys = new Map(
  Object.entries(messages.en ?? {}).map(([source, english]) => [
    english,
    source,
  ]),
);

export function translateMessage(
  locale: Locale,
  key: string,
  fallback = key,
): string {
  const labText = chatLabMessages[locale]?.[key] ?? chatLabMessages.en?.[key];
  if (labText) return labText;
  const rendererText =
    chatRendererMessages[locale]?.[key] ?? chatRendererMessages.en?.[key];
  if (rendererText) return rendererText;
  const chatText = chatMessages[locale]?.[key] ?? chatMessages.en?.[key];
  if (chatText) return chatText;
  const source = Object.hasOwn(messages["zh-CN"] ?? {}, key)
    ? key
    : englishKeys.get(key);
  if (source)
    return messages[locale]?.[source] ?? messages.en?.[source] ?? fallback;
  // Generated demo project names have a stable numeric suffix.
  const numbered = key.match(/^(.+) (\d+)$/);
  if (numbered && englishKeys.has(numbered[1])) {
    return `${translateMessage(locale, numbered[1])} ${numbered[2]}`;
  }
  return fallback;
}
