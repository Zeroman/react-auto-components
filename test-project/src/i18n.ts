import { useCallback, useContext, createContext } from "react";
import { translateMessage, type LanguagePreference, type Locale } from "./locale";

// Hooks and context only. Keep component exports out of this file: mixed
// component/hook exports break React Fast Refresh, turning every dictionary
// edit into a full page reload. Components live in DemoLanguage.tsx.
export type DemoLanguage = {
  locale: Locale;
  preference: LanguagePreference;
  setPreference: (value: LanguagePreference) => void;
  translate: (key: string, fallback?: string) => string;
};
export const DemoLanguageContext = createContext<DemoLanguage | null>(null);

export function useDemoLanguage() {
  const value = useContext(DemoLanguageContext);
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
