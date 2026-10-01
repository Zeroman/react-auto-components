import { useCallback } from "react";
import { useAutoConfig } from "./AutoConfigProvider";

/** Translate built-in text without changing the provider's existing t contract. */
export function useAutoText() {
  const { t } = useAutoConfig();
  return useCallback(
    (message: string, values: readonly unknown[] = []) =>
      t(message, message).replace(/\{(\d+)\}/g, (token, index: string) =>
        Number(index) < values.length ? String(values[Number(index)]) : token,
      ),
    [t],
  );
}
