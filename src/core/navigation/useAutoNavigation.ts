import { useSyncExternalStore } from "react";
import { RacError } from "../errors";
import { useEnclosingNavigation } from "./AutoNavigationContext";
import type { AutoNavigation } from "./types";

export function useAutoNavigation(): AutoNavigation {
  const nav = useEnclosingNavigation();
  if (!nav) {
    throw new RacError(
      "AutoNavigation",
      "RAC-NAV-NO-PROVIDER",
      "useAutoNavigation was called without an enclosing AutoNavigationProvider.",
      "Wrap your navigation components in <AutoNavigationProvider>.",
    );
  }
  // Subscribe to navigation state so components re-render when navigation state changes
  useSyncExternalStore(
    (onStoreChange) => nav.subscribe(onStoreChange),
    () => nav.getState(),
    () => nav.getState(),
  );
  return nav;
}
