import { useEffect, useMemo, useRef } from "react";
import { useAutoConfig } from "../AutoConfigProvider";
import {
  NavigationContext,
  RouteActiveContext,
  RoutePathContext,
} from "./AutoNavigationContext";
import { createAutoNavigation } from "./createAutoNavigation";
import { syncHistory } from "./history";
import type { AutoNavigation, AutoNavigationProviderProps } from "./types";

export function AutoNavigationProvider({
  navigation: userNavigation,
  initialPath,
  initialParams,
  history,
  children,
}: AutoNavigationProviderProps) {
  const config = useAutoConfig();
  const pendingDestroy = useRef(
    new Map<AutoNavigation, { cancelled: boolean }>(),
  );

  const navigation = useMemo(() => {
    return (
      userNavigation ?? createAutoNavigation({ initialPath, initialParams })
    );
  }, [userNavigation]);

  // Optional DevTools discovery: no global engine and no tooling dependency.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const discover = (event: Event) => {
      const detail = (event as CustomEvent<{ adapters?: AutoNavigation[] }>)
        .detail;
      if (Array.isArray(detail?.adapters)) detail.adapters.push(navigation);
    };
    window.addEventListener("rac:discover-navigation", discover);
    return () =>
      window.removeEventListener("rac:discover-navigation", discover);
  }, [navigation]);

  // Synchronize canAccess when config changes
  useEffect(() => {
    if (config.canAccess) {
      navigation.setCanAccess(config.canAccess);
    }
  }, [navigation, config.canAccess]);

  // History sync (pluggable history adapter)
  useEffect(() => {
    if (history) {
      return syncHistory(navigation, history);
    }
  }, [navigation, history]);

  // Clean up internally created instance on unmount (with StrictMode replay support)
  useEffect(() => {
    const scheduled = pendingDestroy.current.get(navigation);
    if (scheduled) {
      scheduled.cancelled = true;
      pendingDestroy.current.delete(navigation);
    }
    return () => {
      if (userNavigation) return;
      const ticket = { cancelled: false };
      pendingDestroy.current.set(navigation, ticket);
      queueMicrotask(() => {
        if (!ticket.cancelled) navigation.destroy();
        if (pendingDestroy.current.get(navigation) === ticket) {
          pendingDestroy.current.delete(navigation);
        }
      });
    };
  }, [navigation, userNavigation]);

  return (
    <NavigationContext value={navigation}>
      <RoutePathContext value={[]}>
        <RouteActiveContext value={true}>{children}</RouteActiveContext>
      </RoutePathContext>
    </NavigationContext>
  );
}
