import type { ReactNode } from "react";
import type { Access } from "../types";
export type { Access };

/** Navigation result status. */
export type AutoNavigationStatus =
  "success" | "not-found" | "forbidden" | "cancelled";

/** Unified location structure separating logical path segments from parameter dictionary. */
export interface AutoLocation {
  path: readonly string[];
  params?: Record<string, string>;
}

/** Snapshots describe router state; navigation events express new user intent. */
export interface AutoHistoryChange {
  type: "snapshot" | "navigation";
}

/** Merge a parameter patch; null removes a key, while an empty string is retained. */
export type AutoParamsPatch = Record<string, string | null>;

/**
 * Interface for pluggable browser or memory history synchronization.
 * Writes may update read() synchronously, return a promise that settles after
 * the location is observable through read(), or return void and
 * acknowledge a deferred write through subscribe(). Rejected writes release
 * the queue. A deferred void write is released when another location is
 * published (e.g. a redirect) or after 2 seconds without acknowledgment.
 */
export interface AutoHistoryAdapter {
  read(): AutoLocation;
  push(location: AutoLocation): void | Promise<void>;
  replace(location: AutoLocation): void | Promise<void>;
  subscribe(
    onChange: (location: AutoLocation, change?: AutoHistoryChange) => void,
  ): () => void;
}

/** Event fired exclusively when a transition commits or reconcile commits a change. */
export interface AutoNavigationCommitEvent {
  path: readonly string[];
  pathString: string;
  params: Readonly<Record<string, string>>;
  replace: boolean;
  source: "history" | "navigate" | "reconcile";
  transitionId: number;
}

/** Options for navigating to a destination. */
export interface AutoGotoOptions {
  /** Optional parameter dictionary to associate with the target. */
  params?: Record<string, string>;
  /** Replace the current history entry when history sync is enabled. */
  replace?: boolean;
  /** Internal base path for resolving relative `./` and `../` paths. */
  basePath?: readonly string[];
  /** Maximum time in milliseconds to wait for a lazy node to register. Default 2000ms. */
  timeoutMs?: number;
  /** Source of this navigation; 'history' navigations do not trigger write-back to history adapters. */
  source?: "history" | "navigate" | "reconcile";
}

/** Result returned by goto() and replace(). */
export interface AutoNavigationResult {
  status: AutoNavigationStatus;
  path: readonly string[];
  pathString: string;
  params: Readonly<Record<string, string>>;
  error?: string;
  cancelledBy?: "new-navigation" | "unmount" | "user";
}

/** Current snapshot of navigation state. */
export interface AutoNavigationState {
  path: readonly string[];
  pathString: string;
  params: Readonly<Record<string, string>>;
  lastNavigationType?: "push" | "replace";
}

/** Child declaration on a route node. */
export interface AutoRouteChildDeclaration extends Access {
  id: string;
  label?: string;
  disabled?: boolean;
  hidden?: boolean | (() => boolean);
  /** Shortcut target; clicking calls goto without mounting a duplicate content subtree. */
  target?: string | readonly string[];
  /** Wait for this lazy container to register before resolving its default child. */
  awaitRegistration?: boolean;
}

/** Configuration passed to useAutoRoute or route-aware containers. */
export interface AutoRouteConfig extends Access {
  /** Explicit name adding a segment to the navigation path. Omit to continue parent node. */
  name?: string;
  /** Child id to navigate into upon ordinary entry when no child segment was specified. */
  defaultChild?: string;
  /** Declared children for this node level. */
  children?: readonly (string | AutoRouteChildDeclaration)[];
  disabled?: boolean;
  hidden?: boolean | (() => boolean);
}

/** Options for createAutoNavigation(). */
export interface AutoNavigationOptions {
  initialPath?: string | readonly string[];
  initialParams?: Record<string, string>;
  /** Permission check function. Defaults to allowing all. */
  canAccess?: (access: Access) => boolean;
  /** Maximum wait time in ms for lazy child registration before resolving not-found. Default 2000ms. */
  readyTimeoutMs?: number;
}

/** Internal registration structure for active navigation tree nodes. */
export interface AutoNavigationNodeRegistration extends Access {
  id: string;
  ticketId: number;
  parentPath: readonly string[];
  name?: string;
  routePath: readonly string[];
  defaultChild?: string;
  children?: readonly (string | AutoRouteChildDeclaration)[];
  getChildren?: () => readonly AutoRouteChildDeclaration[];
  disabled?: boolean;
  hidden?: boolean | (() => boolean);
  /** Local node-level permission checker from local AutoConfigProvider. */
  canAccess?: (access: Access) => boolean;
  /** True if this node is currently within an active branch. */
  isActive?: () => boolean;
}

/** Navigation instance interface. Usable inside or outside React. */
export interface AutoNavigation {
  /** Reactive current path. */
  readonly path: readonly string[];
  /** Reactive current path string. */
  readonly pathString: string;
  /** Reactive current parameters. */
  readonly params: Readonly<Record<string, string>>;
  /** Get current path as an array of segments. */
  getPath(): readonly string[];
  /** Get current path as a ':' separated string. */
  getPathString(): string;
  /** Get current route parameters. */
  getParams(): Readonly<Record<string, string>>;
  /** AbortSignal for the settled route state; cancelled when path/params change. */
  getSignal(): AbortSignal;
  /** Monotonic serial of the latest navigation transition. */
  getTransitionId?(): number;
  /** Get last committed location without uncommitted lazy intermediate paths. */
  getCommittedLocation?(): AutoLocation;
  /** Navigate to target path. */
  goto(
    target: string | readonly string[],
    options?: AutoGotoOptions,
  ): Promise<AutoNavigationResult>;
  /** Navigate to target path with replace flag. */
  replace(
    target: string | readonly string[],
    options?: AutoGotoOptions,
  ): Promise<AutoNavigationResult>;
  /** Merge parameters (null deletes). Updates a pending destination without cancelling it. */
  setParams(
    params: AutoParamsPatch,
    options?: { replace?: boolean },
  ): Promise<AutoNavigationResult>;
  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(listener: (state: AutoNavigationState) => void): () => void;
  /** Subscribe exclusively to committed navigation transitions (for URL sync). */
  subscribeCommit(
    listener: (event: AutoNavigationCommitEvent) => void,
  ): () => void;
  /** Get current state snapshot. */
  getState(): AutoNavigationState;
  /** Re-evaluate permissions and validity of current path, reconciling to valid ancestor if needed. */
  reconcile(): void;
  /** Update permission checker (e.g. from AutoConfigProvider). */
  setCanAccess(fn: (access: Access) => boolean): void;
  /** Internal node registration. Returns unregister callback. */
  registerNode(node: AutoNavigationNodeRegistration): () => void;
  /** Internal node update. */
  updateNode(
    id: string,
    updates: Partial<AutoNavigationNodeRegistration>,
  ): void;
  /** Clean up any timers, listeners or hash adapters. */
  destroy(): void;
}

/** Value returned by useAutoRoute(). */
export interface AutoRouteContextValue {
  /** Full current navigation path. */
  path: readonly string[];
  /** Structural path of this route node (parent path + name), independent of current selection. */
  nodePath: readonly string[];
  /** Full current navigation path string. */
  pathString: string;
  /** Current route parameters. */
  params: Readonly<Record<string, string>>;
  /** AbortSignal tied to this route's settled params and activation lifecycle. */
  signal: AbortSignal;
  /** Immediate child segment if this route is currently in the active path. */
  activeChild?: string;
  /** Remaining subpath segments below this route. */
  activeSubpath: readonly string[];
  /** Navigate relative to this route's position in the component tree. */
  goto: (
    target: string | readonly string[],
    options?: AutoGotoOptions,
  ) => Promise<AutoNavigationResult>;
  /** Replace relative to this route's position in the component tree. */
  replace: (
    target: string | readonly string[],
    options?: AutoGotoOptions,
  ) => Promise<AutoNavigationResult>;
  /** Update parameters. */
  setParams: (params: AutoParamsPatch) => Promise<AutoNavigationResult>;
}

/** Props for AutoNavigationProvider. */
export interface AutoNavigationProviderProps {
  /** Optional existing navigation instance. If omitted, one is created for this provider. */
  navigation?: AutoNavigation;
  initialPath?: string | readonly string[];
  initialParams?: Record<string, string>;
  /** Pluggable history adapter for URL or memory synchronization. */
  history?: AutoHistoryAdapter;
  children: ReactNode;
}
