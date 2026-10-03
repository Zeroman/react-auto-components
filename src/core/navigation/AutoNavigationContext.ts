import { createContext, useContext } from "react";
import type { AutoNavigation } from "./types";

export const NavigationContext = createContext<AutoNavigation | null>(null);

/** Current hierarchical path of the enclosing route. Root is empty array []. */
export const RoutePathContext = createContext<readonly string[]>([]);

/** True if the current component is in an active branch (false when keepMounted hidden). */
export const RouteActiveContext = createContext<boolean>(true);

export function useEnclosingNavigation(): AutoNavigation | null {
  return useContext(NavigationContext);
}

export function useEnclosingRoutePath(): readonly string[] {
  return useContext(RoutePathContext);
}

export function useEnclosingRouteActive(): boolean {
  return useContext(RouteActiveContext);
}
