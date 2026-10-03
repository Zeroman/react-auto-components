import messages from "./messages";
import chatLabMessages from "./chatLabMessages";
import chatMessages from "./chatMessages";
import chatRendererMessages from "./chatRendererMessages";
import mockMessages from "./mockMessages";
import serverFormMessages from "./examples/mock/ServerFormMessages";
import serverNavigationMessages from "./examples/mock/ServerNavigationMessages";
import serverDataMessages from "./examples/mock/ServerDataMessages";

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

export function translateMessage(
  locale: Locale,
  key: string,
  fallback = key,
): string {
  for (const catalog of [
    mockMessages,
    serverFormMessages,
    serverNavigationMessages,
    serverDataMessages,
  ]) {
    const text = catalog[locale]?.[key] ?? catalog.en?.[key];
    if (text) return text;
  }
  const labText = chatLabMessages[locale]?.[key] ?? chatLabMessages.en?.[key];
  if (labText) return labText;
  const rendererText =
    chatRendererMessages[locale]?.[key] ?? chatRendererMessages.en?.[key];
  if (rendererText) return rendererText;
  const chatText = chatMessages[locale]?.[key] ?? chatMessages.en?.[key];
  if (chatText) return chatText;
  const text = messages[locale]?.[key];
  if (text) return text;
  // Generated demo project names keep a stable numeric suffix.
  const numbered = key.match(/^(.+) (\d+)$/);
  if (numbered && Object.hasOwn(messages.en ?? {}, numbered[1])) {
    return `${translateMessage(locale, numbered[1])} ${numbered[2]}`;
  }
  return fallback;
}
