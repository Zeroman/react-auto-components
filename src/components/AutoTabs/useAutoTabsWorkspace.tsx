import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import { equal, resolveHidden } from "../../core/config";
import type { Access, StorageAdapter } from "../../core/types";
import type { AutoTab, AutoTabsProps } from "./index";

/** Only JSON data is persisted; components and callbacks belong in the page registry. */
export type AutoTabsJSON =
  | null
  | boolean
  | number
  | string
  | readonly AutoTabsJSON[]
  | {
      readonly [key: string]: AutoTabsJSON;
    };

export interface AutoWorkspaceTab {
  /** Stable business identity. Opening an existing id activates it without replacing its draft. */
  id: string;
  page: string;
  title?: string;
  params?: AutoTabsJSON;
  state?: AutoTabsJSON;
  /** Cannot be closed. Pinned default tabs are also restored if missing from storage. */
  pinned?: boolean;
}

export interface AutoWorkspacePage extends Access {
  title: string;
  icon?: ReactNode;
  disabled?: boolean;
  hidden?: boolean | (() => boolean);
  /** Restores focus to the last active element inside this page on return. Default true. */
  restoreFocus?: boolean;
  /** Focus target on first visit when there is no remembered element. */
  focusTarget?: AutoTab["focusTarget"];
  /** Validate persisted parameters/state against the application's current schema. */
  validate?: (tab: Readonly<AutoWorkspaceTab>) => boolean;
  render: (context: {
    tab: Readonly<AutoWorkspaceTab>;
    /** Replaces this tab's persisted state. Use null to clear it. */
    setState: (
      state:
        AutoTabsJSON | ((previous: AutoTabsJSON | undefined) => AutoTabsJSON),
    ) => boolean;
  }) => ReactNode;
}

export interface AutoTabsWorkspaceOptions {
  /** Storage key is `${namespace}:tabs:${workspaceId}`. Include user/tenant identity when needed. */
  workspaceId: string;
  pages: Readonly<Record<string, AutoWorkspacePage>>;
  defaultTabs?: readonly AutoWorkspaceTab[];
  defaultActiveId?: string;
  /** Default sessionStorage. `false` keeps everything in memory. An adapter uses the provider's storage contract. */
  storage?: "session" | "local" | StorageAdapter | false;
  /** False or a rejection cancels the close. Rejections propagate from `close()`. */
  beforeClose?: (tab: Readonly<AutoWorkspaceTab>) => boolean | Promise<boolean>;
  /** Storage failures leave the workspace usable in memory. */
  onPersistenceError?: (error: unknown) => void;
  /** Restores focus to the last active element inside tab panels on return. Default true. */
  restoreFocus?: boolean;
  /** Default focus target for workspace pages that don't specify their own. */
  focusTarget?: AutoTabsProps["focusTarget"];
}

export interface AutoTabsWorkspace {
  /** False until the client has restored storage, avoiding hydration differences and premature page requests. */
  ready: boolean;
  tabs: readonly AutoWorkspaceTab[];
  activeId: string | undefined;
  items: readonly AutoTab[];
  /** Spread onto AutoTabs. Defaults to lazy mounting and retaining visited panels. */
  tabsProps: Pick<
    AutoTabsProps,
    | "items"
    | "value"
    | "onChange"
    | "onClose"
    | "keepMounted"
    | "lazy"
    | "restoreFocus"
    | "focusTarget"
  >;
  /** Returns false before restoration or for an unknown, disabled, inaccessible, or invalid page. */
  open: (tab: AutoWorkspaceTab) => boolean;
  activate: (id: string) => boolean;
  /** Selects the next available neighbor when the active tab is closed. Concurrent closes of one id are ignored. */
  close: (id: string) => Promise<boolean>;
  setTabState: (
    id: string,
    state:
      AutoTabsJSON | ((previous: AutoTabsJSON | undefined) => AutoTabsJSON),
  ) => boolean;
}

interface Snapshot {
  version: 1;
  tabs: readonly AutoWorkspaceTab[];
  activeId?: string;
}

function browserStorage(
  kind: "sessionStorage" | "localStorage",
): StorageAdapter {
  return {
    get: (key) => {
      const value = globalThis[kind].getItem(key);
      return value === null ? undefined : JSON.parse(value);
    },
    set: (key, value) => globalThis[kind].setItem(key, JSON.stringify(value)),
    remove: (key) => globalThis[kind].removeItem(key),
  };
}
const sessionStore = browserStorage("sessionStorage");
const localStore = browserStorage("localStorage");

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function json(
  value: unknown,
  ancestors = new Set<object>(),
): value is AutoTabsJSON {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || ancestors.has(value)) return false;
  if (
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  )
    return false;
  ancestors.add(value);
  const valid = Object.values(value).every((entry) => json(entry, ancestors));
  ancestors.delete(value);
  return valid;
}

function descriptor(value: unknown): AutoWorkspaceTab | undefined {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.page !== "string" ||
    !value.page
  )
    return;
  if (value.title !== undefined && typeof value.title !== "string") return;
  if (value.pinned !== undefined && typeof value.pinned !== "boolean") return;
  if (value.params !== undefined && !json(value.params)) return;
  if (value.state !== undefined && !json(value.state)) return;
  return {
    id: value.id,
    page: value.page,
    ...(value.title === undefined ? {} : { title: value.title }),
    ...(value.params === undefined
      ? {}
      : { params: value.params as AutoTabsJSON }),
    ...(value.state === undefined
      ? {}
      : { state: value.state as AutoTabsJSON }),
    ...(value.pinned === undefined ? {} : { pinned: value.pinned }),
  };
}

function createStore() {
  let snapshot: Snapshot & { ready: boolean } = {
    version: 1,
    tabs: [],
    ready: false,
  };
  const listeners = new Set<() => void>();
  return {
    active: false,
    pending: new Set<string>(),
    get: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next: Snapshot) {
      const value = { ...next, ready: true };
      if (equal(snapshot, value)) return false;
      snapshot = value;
      listeners.forEach((listener) => listener());
      return true;
    },
  };
}

/**
 * Manages a flat group of dynamic pages without depending on a router.
 * Restoration runs after mount. Tabs, selection, parameters and explicit page state survive refresh;
 * arbitrary component state does not. Use one owner per storage key and await `ready` before opening pages.
 * Changing the namespace, workspaceId or storage adapter switches to an independent workspace.
 */
export function useAutoTabsWorkspace(
  options: AutoTabsWorkspaceOptions,
): AutoTabsWorkspace {
  const services = useAutoConfig();
  const storage =
    options.storage === false
      ? undefined
      : options.storage === "local"
        ? localStore
        : !options.storage || options.storage === "session"
          ? sessionStore
          : options.storage;
  const key = `${services.namespace}:tabs:${options.workspaceId}`;
  const store = useMemo(() => createStore(), [key, storage]);
  const snapshot = useSyncExternalStore(store.subscribe, store.get, store.get);
  useEffect(() => {
    store.active = true;
    return () => {
      store.active = false;
    };
  }, [store]);

  function pageFor(tab: AutoWorkspaceTab) {
    if (!Object.hasOwn(options.pages, tab.page)) return;
    const page = options.pages[tab.page];
    if (!page || resolveHidden(page.hidden) || !services.canAccess(page))
      return;
    if (page.validate && !page.validate(tab)) return;
    return page;
  }

  function normalize(value: Snapshot): Snapshot {
    const tabs: AutoWorkspaceTab[] = [];
    const seen = new Set<string>();
    const pinned = (options.defaultTabs ?? []).filter((tab) => tab.pinned);
    for (const entry of [...value.tabs, ...pinned]) {
      let tab = descriptor(entry);
      if (!tab || seen.has(tab.id)) continue;
      const id = tab.id;
      const fixed = pinned.find((item) => item.id === id);
      if (fixed)
        tab = {
          ...fixed,
          state: tab.page === fixed.page ? tab.state : fixed.state,
          pinned: true,
        };
      if (!pageFor(tab)) continue;
      seen.add(tab.id);
      tabs.push(tab);
    }
    const selectable = tabs.filter((tab) => !pageFor(tab)?.disabled);
    const activeId =
      selectable.find((tab) => tab.id === value.activeId)?.id ??
      selectable[0]?.id;
    return { version: 1, tabs, activeId };
  }

  function commit(next: Snapshot) {
    if (!store.active) return;
    const clean = normalize(next);
    if (store.set(clean)) {
      try {
        storage?.set(key, clean);
      } catch (error) {
        options.onPersistenceError?.(error);
      }
    }
  }

  // Revalidate on registry/permission changes, including callbacks whose identity stays stable.
  useEffect(() => {
    if (store.get().ready) {
      commit(store.get());
      return;
    }
    let restored: unknown;
    try {
      restored = storage?.get(key);
    } catch (error) {
      options.onPersistenceError?.(error);
    }
    commit(
      record(restored) && restored.version === 1 && Array.isArray(restored.tabs)
        ? {
            version: 1,
            tabs: restored.tabs,
            activeId:
              typeof restored.activeId === "string"
                ? restored.activeId
                : undefined,
          }
        : {
            version: 1,
            tabs: options.defaultTabs ?? [],
            activeId: options.defaultActiveId,
          },
    );
  });

  function activate(id: string) {
    if (!store.active || !store.get().ready) return false;
    const next = normalize(store.get());
    const tab = next.tabs.find((item) => item.id === id);
    if (!tab || pageFor(tab)?.disabled) return false;
    commit({ ...next, activeId: id });
    return true;
  }

  function open(input: AutoWorkspaceTab) {
    if (!store.active || !store.get().ready) return false;
    const tab = descriptor(input);
    if (!tab) return false;
    const existing = store.get().tabs.find((item) => item.id === tab.id);
    if (existing) return existing.page === tab.page && activate(tab.id);
    const page = pageFor(tab);
    if (!page || page.disabled) return false;
    // Detach caller-owned objects so later mutations cannot silently change persisted state.
    commit({
      ...store.get(),
      tabs: [...store.get().tabs, JSON.parse(JSON.stringify(tab))],
      activeId: tab.id,
    });
    return true;
  }

  async function close(id: string) {
    const target = store.get().tabs.find((tab) => tab.id === id);
    if (!store.active || !target || target.pinned || store.pending.has(id))
      return false;
    store.pending.add(id);
    try {
      if (options.beforeClose && !(await options.beforeClose(target)))
        return false;
      if (!store.active) return false;
      const current = normalize(store.get());
      const index = current.tabs.findIndex((tab) => tab.id === id);
      if (index < 0 || current.tabs[index].pinned) return false;
      // A changed draft must be reviewed again after an asynchronous close guard.
      if (!equal(current.tabs[index], target)) return false;
      const tabs = current.tabs.filter((tab) => tab.id !== id);
      const neighbor = [
        ...current.tabs.slice(index + 1),
        ...current.tabs.slice(0, index).reverse(),
      ].find((tab) => !pageFor(tab)?.disabled);
      commit({
        version: 1,
        tabs,
        activeId: current.activeId === id ? neighbor?.id : current.activeId,
      });
      return true;
    } finally {
      store.pending.delete(id);
    }
  }

  function setTabState(
    id: string,
    state:
      AutoTabsJSON | ((previous: AutoTabsJSON | undefined) => AutoTabsJSON),
  ) {
    if (!store.active) return false;
    const current = store.get();
    const tab = current.tabs.find((item) => item.id === id);
    if (!tab || !pageFor(tab)) return false;
    const next = typeof state === "function" ? state(tab.state) : state;
    if (!json(next)) return false;
    const updated = {
      ...tab,
      state: JSON.parse(JSON.stringify(next)) as AutoTabsJSON,
    };
    if (!pageFor(updated)) return false;
    commit({
      ...current,
      tabs: current.tabs.map((item) => (item.id === id ? updated : item)),
    });
    return true;
  }

  const current = snapshot.ready ? normalize(snapshot) : snapshot;
  const items: AutoTab[] = current.tabs.map((tab) => {
    const page = pageFor(tab)!;
    return {
      id: tab.id,
      label: tab.title ?? page.title,
      icon: page.icon,
      disabled: page.disabled,
      closable: !tab.pinned,
      restoreFocus: page.restoreFocus,
      focusTarget: page.focusTarget,
      content: (
        <WorkspacePage
          page={page}
          tab={tab}
          setState={(state) => setTabState(tab.id, state)}
        />
      ),
    };
  });
  return {
    ready: snapshot.ready,
    tabs: current.tabs,
    activeId: current.activeId,
    items,
    open,
    activate,
    close,
    setTabState,
    tabsProps: {
      items,
      value: current.activeId ? [current.activeId] : [],
      onChange: (path) => {
        if (path[0]) activate(path[0]);
      },
      onClose: (path) => {
        void close(path[0]).catch((error: unknown) =>
          services.notify(
            error instanceof Error ? error.message : String(error),
            "error",
          ),
        );
      },
      lazy: true,
      keepMounted: true,
      restoreFocus: options.restoreFocus,
      focusTarget: options.focusTarget,
    },
  };
}

function WorkspacePage({
  page,
  ...context
}: Parameters<AutoWorkspacePage["render"]>[0] & { page: AutoWorkspacePage }) {
  return page.render(context);
}
