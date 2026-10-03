import { useEffect, useMemo, useRef } from "react";
import { useAutoConfig } from "../AutoConfigProvider";
import {
  NavigationContext,
  RouteActiveContext,
  RoutePathContext,
} from "./AutoNavigationContext";
import { createAutoNavigation } from "./createAutoNavigation";
import { createHashHistory, syncHistory } from "./history";
import type { AutoNavigation, AutoNavigationProviderProps } from "./types";

export function AutoNavigationProvider({
  navigation: userNavigation,
  initialPath,
  initialParams,
  history,
  hashSync = false,
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

  // Synchronize canAccess when config changes
  useEffect(() => {
    if (config.canAccess) {
      navigation.setCanAccess(config.canAccess);
    }
  }, [navigation, config.canAccess]);

  // History sync (pluggable history adapter or legacy hashSync)
  useEffect(() => {
    const adapter = history ?? (hashSync ? createHashHistory() : undefined);
    if (adapter) {
      return syncHistory(navigation, adapter);
    }
  }, [navigation, history, hashSync]);

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
