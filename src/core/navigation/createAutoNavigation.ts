import {
  isSubpath,
  joinPath,
  parsePath,
  pathsEqual,
  resolveRelativePath,
} from "./path";
import type {
  Access,
  AutoGotoOptions,
  AutoNavigation,
  AutoNavigationCommitEvent,
  AutoNavigationNodeRegistration,
  AutoNavigationOptions,
  AutoNavigationResult,
  AutoNavigationState,
  AutoRouteChildDeclaration,
} from "./types";

function paramsEqual(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export function createAutoNavigation(
  options: AutoNavigationOptions = {},
): AutoNavigation {
  let transitionSerial = 0;
  let currentPath: string[] = options.initialPath
    ? Array.isArray(options.initialPath)
      ? [...options.initialPath]
      : parsePath(options.initialPath)
    : [];
  let currentParams: Record<string, string> = {
    ...(options.initialParams ?? {}),
  };
  let lastCommittedPath: string[] = [...currentPath];
  let lastCommittedParams: Record<string, string> = { ...currentParams };
  const factoryCanAccess = options.canAccess ?? (() => true);
  let providerCanAccess: ((access: Access) => boolean) | null = null;
  let canAccessFn: (access: Access) => boolean = factoryCanAccess;

  function updateCanAccessFn() {
    canAccessFn = (access: Access) => {
      if (!factoryCanAccess(access)) return false;
      if (providerCanAccess && !providerCanAccess(access)) return false;
      return true;
    };
  }

  const readyTimeoutDefault = options.readyTimeoutMs ?? 2000;

  // Cached state for useSyncExternalStore reference stability
  let cachedState: AutoNavigationState = {
    path: [...currentPath],
    pathString: joinPath(currentPath),
    params: { ...currentParams },
  };

  function updateCachedState(lastNavType?: "push" | "replace") {
    cachedState = {
      path: [...currentPath],
      pathString: joinPath(currentPath),
      params: { ...currentParams },
      lastNavigationType: lastNavType ?? cachedState.lastNavigationType,
    };
  }

  // Signal aborted whenever settled path or params change.
  let currentSignalController = new AbortController();

  const listeners = new Set<(state: AutoNavigationState) => void>();
  const commitListeners = new Set<(event: AutoNavigationCommitEvent) => void>();
  const nodeListeners = new Set<() => void>();
  const registeredNodes = new Map<string, AutoNavigationNodeRegistration>();

  // Currently active transition (if any).
  type Transition = {
    id: number;
    controller: AbortController;
    target: string[];
    params: Record<string, string>;
    replace?: boolean;
    source?: "history" | "navigate" | "reconcile";
    resolve: (result: AutoNavigationResult) => void;
    promise: Promise<AutoNavigationResult>;
    timer?: ReturnType<typeof setTimeout>;
  };
  let activeTransition: Transition | null = null;

  function notifyState() {
    const state = getState();
    for (const listener of Array.from(listeners)) {
      try {
        listener(state);
      } catch (err) {
        console.error(err);
      }
    }
  }

  function notifyNodeChange() {
    for (const listener of Array.from(nodeListeners)) {
      try {
        listener();
      } catch (err) {
        console.error(err);
      }
    }
    // Check if active transition can now make progress
    if (activeTransition) {
      attemptTransition(activeTransition);
    }
  }

  function checkAccess(
    item: {
      disabled?: boolean;
      hidden?: boolean | (() => boolean);
      roles?: readonly string[];
      permissions?: readonly string[];
      mode?: "all" | "any";
    },
    node?: AutoNavigationNodeRegistration,
  ): { ok: boolean; reason?: "disabled" | "hidden" | "forbidden" } {
    if (item.disabled) return { ok: false, reason: "disabled" };
    const isHidden =
      typeof item.hidden === "function" ? item.hidden() : item.hidden;
    if (isHidden) return { ok: false, reason: "hidden" };
    if (node?.canAccess && !node.canAccess(item))
      return { ok: false, reason: "forbidden" };
    if (!canAccessFn(item)) return { ok: false, reason: "forbidden" };
    return { ok: true };
  }

  /** Finds the active registered node at or for routePath. */
  function findNode(
    routePath: readonly string[],
  ): AutoNavigationNodeRegistration | undefined {
    for (const node of registeredNodes.values()) {
      if (pathsEqual(node.routePath, routePath)) {
        if (node.isActive && !node.isActive()) {
          continue;
        }
        return node;
      }
    }
    return undefined;
  }

  function getDeclaredChildren(
    node: AutoNavigationNodeRegistration,
  ): readonly AutoRouteChildDeclaration[] {
    if (node.getChildren) {
      return node.getChildren();
    }
    return (node as any).children ?? [];
  }

  function failTransition(
    transition: Transition,
    status: "forbidden" | "not-found",
    error: string,
  ) {
    finishTransition(transition, {
      status,
      path: [...lastCommittedPath],
      pathString: joinPath(lastCommittedPath),
      params: { ...lastCommittedParams },
      error,
    });
  }

  function failAccess(
    transition: Transition,
    reason: "disabled" | "hidden" | "forbidden" | undefined,
    targetPath: readonly string[],
  ) {
    failTransition(
      transition,
      reason === "forbidden" || reason === "disabled"
        ? "forbidden"
        : "not-found",
      `Node at ${joinPath(targetPath)} is ${reason ?? "inaccessible"}`,
    );
  }

  function failCyclicShortcut(transition: Transition, shortcutKey: string) {
    failTransition(
      transition,
      "not-found",
      `Cyclic shortcut navigation detected at ${shortcutKey}`,
    );
  }

  function dispatchIntermediate(path: string[]) {
    if (!pathsEqual(currentPath.slice(0, path.length), path)) {
      currentPath = [...path];
      updateCachedState();
      notifyState();
    }
  }

  /**
   * Attempts to advance and resolve the active transition against registered nodes.
   */
  function attemptTransition(transition: Transition) {
    const { target, params } = transition;

    // Walk down the path from root
    let resolvedSegments: string[] = [];
    let remaining = [...target];
    const visitedShortcuts = new Set<string>();
    let awaitingContainer = false;

    function followShortcut(
      shortcutTarget: string | readonly string[],
    ): boolean {
      const shortcutPath = resolveRelativePath(
        shortcutTarget,
        resolvedSegments,
      );
      const shortcutKey = `${joinPath(resolvedSegments)}->${joinPath(shortcutPath)}`;
      if (visitedShortcuts.has(shortcutKey) || visitedShortcuts.size > 20) {
        failCyclicShortcut(transition, shortcutKey);
        return false;
      }
      visitedShortcuts.add(shortcutKey);
      transition.target = shortcutPath;
      remaining = [...shortcutPath];
      resolvedSegments = [];
      return true;
    }

    while (true) {
      const node = findNode(resolvedSegments);

      if (!node) {
        if (awaitingContainer) {
          dispatchIntermediate(resolvedSegments);
          return;
        }

        // No node registered at this exact routePath.
        // Check if remaining[0] matches a registered node directly:
        if (remaining.length > 0) {
          const nextSeg = remaining[0];
          const directChild = findNode([...resolvedSegments, nextSeg]);
          if (directChild) {
            const childAccess = checkAccess(directChild, directChild);
            if (!childAccess.ok) {
              failAccess(transition, childAccess.reason, [
                ...resolvedSegments,
                nextSeg,
              ]);
              return;
            }
            resolvedSegments.push(remaining.shift()!);
            continue;
          }

          // We are waiting for a child node to register
          // Dispatch intermediate path so React can mount the parent component
          dispatchIntermediate([...resolvedSegments, nextSeg]);
          return; // Wait for node registration
        }

        // Target reached and verified
        commitTransition(transition, resolvedSegments, params);
        return;
      }

      // Node exists: verify its access
      awaitingContainer = false;
      const nodeAccess = checkAccess(node, node);
      if (!nodeAccess.ok) {
        failAccess(transition, nodeAccess.reason, resolvedSegments);
        return;
      }

      const children = getDeclaredChildren(node);

      if (remaining.length === 0) {
        // Normal entry into this container without specifying further children
        if (node.defaultChild) {
          const defaultChildDecl = children.find(
            (c) => c.id === node.defaultChild,
          );
          if (defaultChildDecl) {
            const childAccess = checkAccess(defaultChildDecl, node);
            if (childAccess.ok) {
              if (defaultChildDecl.target) {
                if (!followShortcut(defaultChildDecl.target)) return;
                continue;
              }
              resolvedSegments.push(node.defaultChild);
              awaitingContainer = !!defaultChildDecl.awaitRegistration;
              continue;
            }
          } else {
            // defaultChild has no explicit declaration in getChildren, append it
            resolvedSegments.push(node.defaultChild);
            continue;
          }
        }
        // Empty state or leaf container reached
        commitTransition(transition, resolvedSegments, params);
        return;
      }

      // remaining has segments: inspect next segment
      const nextSegment = remaining.shift()!;
      const childDecl = children.find((c) => c.id === nextSegment);

      if (childDecl) {
        const childAccess = checkAccess(childDecl, node);
        if (!childAccess.ok) {
          failAccess(transition, childAccess.reason, [
            ...resolvedSegments,
            nextSegment,
          ]);
          return;
        }

        if (childDecl.target) {
          if (!followShortcut(childDecl.target)) return;
          continue;
        }

        resolvedSegments.push(nextSegment);
        awaitingContainer = !!childDecl.awaitRegistration;
        continue;
      }

      // Child is not in getChildren().
      // Could there be a sub-node registered directly with this routePath?
      const subNode = findNode([...resolvedSegments, nextSegment]);
      if (subNode) {
        const subAccess = checkAccess(subNode, subNode);
        if (!subAccess.ok) {
          failAccess(transition, subAccess.reason, [
            ...resolvedSegments,
            nextSegment,
          ]);
          return;
        }
        resolvedSegments.push(nextSegment);
        continue;
      }

      // If this node explicitly declared children and nextSegment is NOT among them:
      if (children.length > 0) {
        failTransition(
          transition,
          "not-found",
          `Route segment '${nextSegment}' not found under '${joinPath(resolvedSegments)}'`,
        );
        return;
      }

      // Node did not declare children yet; could be lazy loading.
      // Dispatch intermediate path and wait for child registration.
      dispatchIntermediate([...resolvedSegments, nextSegment]);
      return;
    }
  }

  function commitTransition(
    transition: Transition,
    resolvedPath: string[],
    finalParams: Record<string, string>,
  ) {
    if (transition.timer) clearTimeout(transition.timer);
    currentPath = resolvedPath;
    currentParams = finalParams;
    lastCommittedPath = [...resolvedPath];
    lastCommittedParams = { ...finalParams };
    updateCachedState(transition.replace ? "replace" : "push");

    const oldSignal = currentSignalController;
    currentSignalController = new AbortController();
    oldSignal.abort("transition-committed");

    const result: AutoNavigationResult = {
      status: "success",
      path: [...currentPath],
      pathString: joinPath(currentPath),
      params: { ...currentParams },
    };

    const commitEvent: AutoNavigationCommitEvent = {
      path: [...currentPath],
      pathString: joinPath(currentPath),
      params: { ...currentParams },
      replace: !!transition.replace,
      source: transition.source ?? "navigate",
      transitionId: transition.id,
    };

    activeTransition = null;
    notifyState();
    for (const listener of Array.from(commitListeners)) {
      try {
        listener(commitEvent);
      } catch (err) {
        console.error(err);
      }
    }
    transition.resolve(result);
  }

  function finishTransition(
    transition: Transition,
    result: AutoNavigationResult,
  ) {
    if (transition.timer) clearTimeout(transition.timer);
    activeTransition = null;

    const finalResult =
      result.status !== "success"
        ? {
            ...result,
            path: [...lastCommittedPath],
            pathString: joinPath(lastCommittedPath),
            params: { ...lastCommittedParams },
          }
        : result;

    if (result.status !== "success") {
      if (
        !pathsEqual(currentPath, lastCommittedPath) ||
        !paramsEqual(currentParams, lastCommittedParams)
      ) {
        currentPath = [...lastCommittedPath];
        currentParams = { ...lastCommittedParams };
        updateCachedState();
        notifyState();
      }
    }
    transition.resolve(finalResult);
  }

  function navigateInternal(
    target: string | readonly string[],
    options?: AutoGotoOptions,
  ): Promise<AutoNavigationResult> {
    const rawTarget = resolveRelativePath(target, options?.basePath ?? []);
    const params =
      options?.params !== undefined
        ? { ...options.params }
        : { ...currentParams };

    // Cancel existing transition
    if (activeTransition) {
      const prev = activeTransition;
      if (prev.timer) clearTimeout(prev.timer);
      prev.controller.abort("new-navigation");
      prev.resolve({
        status: "cancelled",
        cancelledBy: "new-navigation",
        path: [...lastCommittedPath],
        pathString: joinPath(lastCommittedPath),
        params: { ...lastCommittedParams },
      });
      activeTransition = null;
    }

    let resolve!: (result: AutoNavigationResult) => void;
    const promise = new Promise<AutoNavigationResult>((done) => {
      resolve = done;
    });
    const controller = new AbortController();
    const transitionId = ++transitionSerial;
    const timeoutMs = options?.timeoutMs ?? readyTimeoutDefault;
    const transition: Transition = {
      id: transitionId,
      controller,
      target: rawTarget,
      params,
      replace: options?.replace,
      source: options?.source ?? "navigate",
      resolve,
      promise,
    };
    transition.timer = setTimeout(() => {
      if (activeTransition && activeTransition.id === transitionId) {
        finishTransition(activeTransition, {
          status: "not-found",
          path: [...currentPath],
          pathString: joinPath(currentPath),
          params: { ...currentParams },
          error: `Timeout waiting for route: ${joinPath(rawTarget)}`,
        });
      }
    }, timeoutMs);
    activeTransition = transition;
    attemptTransition(transition);
    return promise;
  }

  // React registers descendants before their parents, and may replay effects.
  // Resolve defaults after that batch, through the same transition engine used
  // by goto(). Never replace a user's already pending destination.
  let defaultsQueued = false;
  function scheduleDefaults() {
    if (defaultsQueued || activeTransition) return;
    defaultsQueued = true;
    queueMicrotask(() => {
      defaultsQueued = false;
      if (activeTransition) return;
      const node = findNode(currentPath);
      if (!node?.defaultChild || !checkAccess(node, node).ok) return;
      const child = getDeclaredChildren(node).find(
        (c) => c.id === node.defaultChild,
      );
      if (child && !checkAccess(child, node).ok) return;
      void navigateInternal(currentPath, {
        replace: true,
        source: "reconcile",
      });
    });
  }

  function getState(): AutoNavigationState {
    return cachedState;
  }

  function reconcile() {
    // Check if the current path is still valid
    let validPrefix: string[] = [];
    let hadRevocation = false;

    for (let i = 0; i <= currentPath.length; i++) {
      const prefix = currentPath.slice(0, i);
      const node = findNode(prefix);
      if (node) {
        const access = checkAccess(node, node);
        if (!access.ok) {
          hadRevocation = true;
          break;
        }
        if (i < currentPath.length) {
          const nextSeg = currentPath[i];
          const children = getDeclaredChildren(node);
          if (children.length > 0) {
            const child = children.find((c) => c.id === nextSeg);
            if (!child || !checkAccess(child, node).ok) {
              validPrefix = prefix;
              hadRevocation = true;
              break;
            }
          }
        }
      }
      validPrefix = prefix;
    }

    if (hadRevocation) {
      // Reconcile to validPrefix or its defaultChild
      const parentNode = findNode(validPrefix);
      if (parentNode?.defaultChild) {
        const children = getDeclaredChildren(parentNode);
        const defChild = children.find((c) => c.id === parentNode.defaultChild);
        if (defChild && checkAccess(defChild, parentNode).ok) {
          validPrefix = [...validPrefix, parentNode.defaultChild];
        } else if (!children.length) {
          validPrefix = [...validPrefix, parentNode.defaultChild];
        }
      }
      currentPath = validPrefix;
      lastCommittedPath = [...validPrefix];
      lastCommittedParams = { ...currentParams };
      updateCachedState("replace");
      const oldSignal = currentSignalController;
      currentSignalController = new AbortController();
      oldSignal.abort("reconcile");
      notifyState();

      const commitEvent: AutoNavigationCommitEvent = {
        path: [...currentPath],
        pathString: joinPath(currentPath),
        params: { ...currentParams },
        replace: true,
        source: "reconcile",
        transitionId: ++transitionSerial,
      };
      for (const listener of Array.from(commitListeners)) {
        try {
          listener(commitEvent);
        } catch (err) {
          console.error(err);
        }
      }
    }
  }

  return {
    get path() {
      return cachedState.path;
    },
    get pathString() {
      return cachedState.pathString;
    },
    get params() {
      return cachedState.params;
    },
    getPath() {
      return [...currentPath];
    },
    getPathString() {
      return joinPath(currentPath);
    },
    getParams() {
      return { ...currentParams };
    },
    getSignal() {
      return currentSignalController.signal;
    },
    getTransitionId() {
      return transitionSerial;
    },
    getCommittedLocation() {
      return {
        path: [...lastCommittedPath],
        params: { ...lastCommittedParams },
      };
    },
    goto(target, options) {
      return navigateInternal(target, {
        ...options,
        replace: options?.replace ?? false,
      });
    },
    replace(target, options) {
      return navigateInternal(target, { ...options, replace: true });
    },
    setParams(patch, options) {
      const transition = activeTransition;
      const params = { ...(transition?.params ?? currentParams) };
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) delete params[key];
        else params[key] = value;
      }
      if (transition) {
        if (!paramsEqual(params, transition.params)) {
          transition.params = params;
          // A local edit of a history destination must publish the edited URL.
          if (transition.source === "history") {
            transition.source = "navigate";
            transition.replace = true;
          }
        }
        if (options?.replace !== undefined)
          transition.replace = options.replace;
        attemptTransition(transition);
        return transition.promise;
      }
      return navigateInternal(currentPath, {
        params,
        replace: options?.replace ?? true,
      });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    subscribeCommit(listener) {
      commitListeners.add(listener);
      return () => {
        commitListeners.delete(listener);
      };
    },
    getState,
    reconcile,
    setCanAccess(fn) {
      providerCanAccess = fn;
      updateCanAccessFn();
      reconcile();
    },
    registerNode(node) {
      registeredNodes.set(node.id, node);
      notifyNodeChange();
      scheduleDefaults();
      return () => {
        const existing = registeredNodes.get(node.id);
        if (existing && existing.ticketId === node.ticketId) {
          registeredNodes.delete(node.id);
          notifyNodeChange();
          reconcile();
        }
      };
    },
    updateNode(id, updates) {
      const existing = registeredNodes.get(id);
      if (existing) {
        Object.assign(existing, updates);
        notifyNodeChange();
        reconcile();
        scheduleDefaults();
      }
    },
    destroy() {
      if (activeTransition?.timer) clearTimeout(activeTransition.timer);
      if (activeTransition) {
        activeTransition.controller.abort("destroyed");
        activeTransition.resolve({
          status: "cancelled",
          cancelledBy: "unmount",
          path: [...lastCommittedPath],
          pathString: joinPath(lastCommittedPath),
          params: { ...lastCommittedParams },
        });
        activeTransition = null;
      }
      listeners.clear();
      commitListeners.clear();
      nodeListeners.clear();
      registeredNodes.clear();
      currentSignalController.abort("destroyed");
    },
  };
}
