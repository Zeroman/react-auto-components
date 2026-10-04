import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useAutoConfig } from "../AutoConfigProvider";
import { resolveHidden } from "../config";
import { isSubpath, joinPath, resolveRelativePath } from "./path";
import {
  RouteActiveContext,
  RoutePathContext,
  useEnclosingNavigation,
  useEnclosingRouteActive,
  useEnclosingRoutePath,
} from "./AutoNavigationContext";
import type {
  AutoGotoOptions,
  AutoParamsPatch,
  AutoNavigationResult,
  AutoNavigationState,
  AutoRouteChildDeclaration,
  AutoRouteConfig,
  AutoRouteContextValue,
} from "./types";

let ticketSerial = 0;

const EMPTY_STATE: AutoNavigationState = {
  path: [],
  pathString: "",
  params: {},
};

/**
 * Scope component providing explicit route structural hierarchy to its descendants.
 * Use when wrapping custom route containers or conditional views.
 */
export function AutoRouteScope({
  path,
  active = true,
  children,
}: {
  path: readonly string[];
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <RoutePathContext value={path}>
      <RouteActiveContext value={active}>{children}</RouteActiveContext>
    </RoutePathContext>
  );
}

function routeSignature(config: AutoRouteConfig): string {
  return JSON.stringify([
    config.defaultChild,
    !!config.disabled,
    resolveHidden(config.hidden),
    config.roles,
    config.permissions,
    (config.children ?? []).map((child) =>
      typeof child === "string"
        ? child
        : [
            child.id,
            !!child.disabled,
            resolveHidden(child.hidden),
            child.roles,
            child.permissions,
            child.target,
            child.awaitRegistration,
          ],
    ),
  ]);
}

export function useAutoRoute(config?: AutoRouteConfig): AutoRouteContextValue {
  const nav = useEnclosingNavigation();
  const services = useAutoConfig();
  const contextParentPath = useEnclosingRoutePath();
  const isContextActive = useEnclosingRouteActive();
  const regId = useId();
  const ticketId = useRef(++ticketSerial).current;

  const configRef = useRef(config);
  configRef.current = config;
  const isContextActiveRef = useRef(isContextActive);
  isContextActiveRef.current = isContextActive;
  const servicesRef = useRef(services);
  servicesRef.current = services;

  // Subscribe to navigation state
  const state = useSyncExternalStore(
    (onStoreChange) => (nav ? nav.subscribe(onStoreChange) : () => {}),
    () => (nav ? nav.getState() : EMPTY_STATE),
    () => (nav ? nav.getState() : EMPTY_STATE),
  );

  // Structural nodePath from parent context and config.name (independent of selection)
  const configName = config?.name;
  const nodePath = useMemo(() => {
    if (!configName) return contextParentPath;
    return [...contextParentPath, configName];
  }, [configName, contextParentPath]);

  const parentPath = contextParentPath;
  const routePath = nodePath;

  // Is this route in the active path?
  const isActive = useMemo(() => {
    if (!isContextActive) return false;
    return isSubpath(routePath, state.path);
  }, [isContextActive, routePath, state.path]);

  // Determine activeChild and activeSubpath
  const { activeChild, activeSubpath } = useMemo(() => {
    if (!isActive) {
      return { activeChild: undefined, activeSubpath: [] };
    }
    const sub = state.path.slice(routePath.length);
    return {
      activeChild: sub.length > 0 ? sub[0] : config?.defaultChild,
      activeSubpath: sub,
    };
  }, [isActive, routePath.length, state.path, config?.defaultChild]);

  // A commit can replace the global signal without changing the visible path
  // (e.g. lazy registration or navigating to the current location).
  const globalSignal = nav?.getSignal();
  const paramsKey = JSON.stringify(state.params);
  const controller = useMemo(() => {
    const next = new AbortController();
    if (!isActive) next.abort("inactive-route");
    return next;
  }, [globalSignal, state.pathString, paramsKey, isActive]);
  const pendingAbort = useRef(
    new Map<AbortController, { cancelled: boolean }>(),
  );
  const currentController = useRef(controller);
  currentController.current = controller;

  useEffect(() => {
    const scheduled = pendingAbort.current.get(controller);
    if (scheduled) {
      scheduled.cancelled = true;
      pendingAbort.current.delete(controller);
    }
    const handleAbort = () => controller.abort("global-signal-abort");
    if (globalSignal?.aborted) handleAbort();
    else globalSignal?.addEventListener("abort", handleAbort);
    return () => {
      globalSignal?.removeEventListener("abort", handleAbort);
      if (currentController.current !== controller) {
        controller.abort("route-update");
        return;
      }
      // Only an effect replay for this same controller may reclaim it. A new
      // route controller must not suppress cancellation of the previous one.
      const ticket = { cancelled: false };
      pendingAbort.current.set(controller, ticket);
      queueMicrotask(() => {
        if (!ticket.cancelled) controller.abort("route-disposed");
        if (pendingAbort.current.get(controller) === ticket) {
          pendingAbort.current.delete(controller);
        }
      });
    };
  }, [globalSignal, controller]);

  // Register this route node with navigation engine ONLY if route configuration is specified
  const hasConfig = config !== undefined;

  useEffect(() => {
    if (!nav || !hasConfig) return;

    const unregister = nav.registerNode({
      id: regId,
      ticketId,
      parentPath,
      name: configRef.current?.name,
      routePath,
      defaultChild: configRef.current?.defaultChild,
      disabled: configRef.current?.disabled,
      hidden: configRef.current?.hidden,
      roles: configRef.current?.roles,
      permissions: configRef.current?.permissions,
      canAccess: (access) => servicesRef.current.canAccess(access),
      isActive: () => isContextActiveRef.current,
      getChildren: () => {
        const rawChildren = configRef.current?.children ?? [];
        return rawChildren.map((item) => {
          if (typeof item === "string") {
            return { id: item };
          }
          return item as AutoRouteChildDeclaration;
        });
      },
    });

    return () => {
      unregister();
    };
  }, [nav, hasConfig, regId, ticketId, parentPath, routePath]);

  // Callers usually build config inline, so compare structure rather than identity.
  const signature = hasConfig ? routeSignature(config) : "";
  useEffect(() => {
    if (!nav || !hasConfig) return;
    const current = configRef.current;
    nav.updateNode(regId, {
      defaultChild: current?.defaultChild,
      disabled: current?.disabled,
      hidden: current?.hidden,
      roles: current?.roles,
      permissions: current?.permissions,
    });
  }, [nav, hasConfig, regId, signature, services.canAccess]);

  const goto = (
    target: string | readonly string[],
    options?: AutoGotoOptions,
  ): Promise<AutoNavigationResult> => {
    if (!nav) {
      return Promise.resolve({
        status: "not-found",
        path: routePath,
        pathString: joinPath(routePath),
        params: state.params,
        error: "No navigation provider",
      });
    }
    return nav.goto(target, { ...options, basePath: routePath });
  };

  const replace = (
    target: string | readonly string[],
    options?: AutoGotoOptions,
  ): Promise<AutoNavigationResult> => {
    if (!nav) {
      return Promise.resolve({
        status: "not-found",
        path: routePath,
        pathString: joinPath(routePath),
        params: state.params,
        error: "No navigation provider",
      });
    }
    return nav.replace(target, { ...options, basePath: routePath });
  };

  const setParams = (
    params: AutoParamsPatch,
  ): Promise<AutoNavigationResult> => {
    if (!nav) {
      return Promise.resolve({
        status: "not-found",
        path: routePath,
        pathString: joinPath(routePath),
        params: state.params,
        error: "No navigation provider",
      });
    }
    return nav.setParams(params);
  };

  return {
    path: state.path,
    nodePath,
    pathString: state.pathString,
    params: state.params,
    signal: controller.signal,
    activeChild,
    activeSubpath,
    goto,
    replace,
    setParams,
  };
}
