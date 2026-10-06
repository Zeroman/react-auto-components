import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  detectLocale,
  isPreference,
  languages,
  languageStorageKey,
  translateMessage,
  type LanguagePreference,
} from "./locale";
import { DemoLanguageContext, useDemoLanguage, useDemoText } from "./i18n";

const browserLanguages = () =>
  navigator.languages?.length ? navigator.languages : [navigator.language];

export function DemoLanguageProvider({ children }: { children: ReactNode }) {
  const [preference, updatePreference] = useState<LanguagePreference>(() => {
    try {
      const saved = localStorage.getItem(languageStorageKey);
      return isPreference(saved) ? saved : "auto";
    } catch {
      return "auto";
    }
  });
  const [detected, setDetected] = useState(() =>
    detectLocale(browserLanguages()),
  );
  const locale = preference === "auto" ? detected : preference;
  const setPreference = useCallback((next: LanguagePreference) => {
    if (!isPreference(next)) return;
    updatePreference(next);
    try {
      localStorage.setItem(languageStorageKey, next);
    } catch {
      /* Optional persistence. */
    }
  }, []);
  useEffect(() => {
    const changed = () => setDetected(detectLocale(browserLanguages()));
    const storageChanged = (event: StorageEvent) => {
      if (event.key === languageStorageKey || event.key === null) {
        updatePreference(
          isPreference(event.newValue) ? event.newValue : "auto",
        );
      }
    };
    window.addEventListener("languagechange", changed);
    window.addEventListener("storage", storageChanged);
    return () => {
      window.removeEventListener("languagechange", changed);
      window.removeEventListener("storage", storageChanged);
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const translate = useCallback(
    (key: string, fallback?: string) =>
      translateMessage(locale, key, fallback),
    [locale],
  );
  const value = useMemo(
    () => ({ locale, preference, setPreference, translate }),
    [locale, preference, setPreference, translate],
  );
  return (
    <DemoLanguageContext value={value}>{children}</DemoLanguageContext>
  );
}

export function LanguagePicker({
  variant = "inline",
}: {
  variant?: "inline" | "block";
} = {}) {
  const { preference, setPreference, locale } = useDemoLanguage();
  const tr = useDemoText();
  if (variant === "block") {
    return (
      <label>
        {tr("Interface language")}
        <select
          aria-label={tr("Interface language")}
          data-testid="language-picker"
          value={preference}
          onChange={(event) => {
            if (isPreference(event.target.value))
              setPreference(event.target.value);
          }}
        >
          <option value="auto">
            {tr("Auto (browser)")} · {languages[locale]}
          </option>
          {Object.entries(languages).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label className="language-picker">
      <span aria-hidden="true">◎</span>
      <select
        aria-label={tr("Interface language")}
        data-testid="language-picker"
        value={preference}
        onChange={(event) => {
          if (isPreference(event.target.value))
            setPreference(event.target.value);
        }}
      >
        <option value="auto">
          {tr("Auto (browser)")} · {languages[locale]}
        </option>
        {Object.entries(languages).map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
