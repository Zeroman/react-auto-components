import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  detectLocale,
  isPreference,
  languages,
  languageStorageKey,
  translateMessage,
  type LanguagePreference,
  type Locale,
} from "./locale";

type DemoLanguage = {
  locale: Locale;
  preference: LanguagePreference;
  setPreference: (value: LanguagePreference) => void;
  translate: (key: string, fallback?: string) => string;
};
const Context = createContext<DemoLanguage | null>(null);
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
    (key: string, fallback?: string) => translateMessage(locale, key, fallback),
    [locale],
  );
  const value = useMemo(
    () => ({ locale, preference, setPreference, translate }),
    [locale, preference, setPreference, translate],
  );
  return <Context value={value}>{children}</Context>;
}

export function useDemoLanguage() {
  const value = useContext(Context);
  if (!value) throw new Error("DemoLanguageProvider is required");
  return value;
}

export function useDemoText() {
  const { translate } = useDemoLanguage();
  return useCallback(
    (key: string, values: readonly unknown[] = []) =>
      translate(key).replace(/\{(\d+)\}/g, (token, index: string) =>
        Number(index) < values.length
          ? String(
              typeof values[Number(index)] === "string"
                ? translate(String(values[Number(index)]))
                : values[Number(index)],
            )
          : token,
      ),
    [translate],
  );
}

export function LanguagePicker() {
  const { preference, setPreference, locale } = useDemoLanguage();
  const tr = useDemoText();
  return (
    <label className="language-picker">
      <span aria-hidden="true">◎</span>
      <select
        aria-label={tr("界面语言")}
        data-testid="language-picker"
        value={preference}
        onChange={(event) => {
          if (isPreference(event.target.value))
            setPreference(event.target.value);
        }}
      >
        <option value="auto">
          {tr("自动（浏览器）")} · {languages[locale]}
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
