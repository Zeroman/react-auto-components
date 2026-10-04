import type { TipConfig } from "./tip";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AutoAccessStore } from "./access";
import { safeStorage } from "./config";
import type { ColumnRegistry, SourceLoader, TabsSource } from "./registry";
import type {
  Access,
  AutoFormLayout,
  ComponentDensity,
  ComponentSize,
  FieldContext,
  SettingsAdapter,
  StorageAdapter,
  TableDensity,
  Values,
} from "./types";
export interface TableGlobalConfig extends TipConfig {
  density?: TableDensity;
  size?: ComponentSize;
}
export interface TabsGlobalConfig extends TipConfig {
  density?: ComponentDensity;
  size?: ComponentSize;
}
export interface MenuGlobalConfig extends TipConfig {
  density?: ComponentDensity;
  size?: ComponentSize;
}
/**
 * App-wide defaults. The provider is optional.
 * With no provider, `namespace` is `"auto"`, `size` is `"medium"`, `density` is `"comfortable"`,
 * form labels sit on top, `t` returns the key, `canAccess` allows everything, and storage is `localStorage`.
 *
 * `namespace` is prepended to persisted keys: `${namespace}:table:${tableId}` and `${namespace}:draft:${draftKey}`.
 * Two apps on one origin that both leave `"auto"` share table settings and dialog drafts. Set a distinct namespace per app.
 * This provider does not mount dialogs. `useAutoDialog()` still needs `AutoDialogProvider`.
 */
export interface AutoServices extends TipConfig {
  /**
   * Storage prefix. Default `"auto"`.
   * Change it when more than one app on the same origin uses tables or dialog drafts.
   */
  namespace: string;
  size?: ComponentSize;
  density?: ComponentDensity;
  table?: TableGlobalConfig;
  tabs?: TabsGlobalConfig;
  menu?: MenuGlobalConfig;
  form: AutoFormLayout & TipConfig;
  t: (key: string, fallback?: string) => string;
  /** Externally writable access state. Updates automatically refresh all consumers. */
  access?: AutoAccessStore;
  /** Custom policy overrides the access store's built-in roles/permissions check. */
  canAccess: (access: Access) => boolean;
  storage: StorageAdapter;
  settings?: SettingsAdapter;
  notify: (message: string, level: "success" | "error") => void;
  /** Custom field widgets, keyed for `Field.component`. */
  fields: Record<string, (context: FieldContext<Values>) => ReactNode>;
  /**
   * Column render, format, sort, and export functions, keyed for `AutoColumn.component`.
   * A function on the column wins over the registry.
   */
  columns: Record<string, ColumnRegistry>;
  /** Row menu handlers, keyed for `RowAction.action` when `onClick` is omitted. */
  rowActions: Record<string, (row: object) => void | Promise<void>>;
  /**
   * Remote table loaders, keyed for `AutoTable` `source`.
   * The registered function must return rows of that table's model.
   */
  sources: Record<string, SourceLoader>;
  /**
   * Remote tab list loaders, keyed for `AutoTabs` `source`.
   * The registered function must return tab items.
   */
  tabsSources: Record<string, TabsSource>;
}
export const defaultServices: AutoServices = {
  namespace: "auto",
  size: "medium",
  density: "comfortable",
  form: {
    labelPosition: "top",
    labelWidth: "auto",
  },
  t: (key, fallback) => fallback ?? key,
  canAccess: () => true,
  storage: safeStorage,
  notify: () => {},
  fields: {},
  columns: {},
  rowActions: {},
  sources: {},
  tabsSources: {},
};
const Context = createContext(defaultServices);
// Keep the unscoped namespace separate so nested providers do not suffix it twice.
const NamespaceContext = createContext(defaultServices.namespace);
const noSubscription = () => () => {};
const noSnapshot = () => undefined;
export function AutoConfigProvider({
  config,
  children,
}: {
  config?: Partial<AutoServices>;
  children: ReactNode;
}) {
  const parent = useContext(Context);
  const parentNamespace = useContext(NamespaceContext);
  const baseNamespace = config?.namespace ?? parentNamespace;
  const access = config?.access ?? parent.access;
  const accessState = useSyncExternalStore(
    access?.subscribe ?? noSubscription,
    access?.getState ?? noSnapshot,
    access?.getState ?? noSnapshot,
  );
  const identity = access
    ? JSON.stringify(accessState?.userId ?? null)
    : undefined;
  const value = useMemo(
    () => ({
      ...parent,
      ...config,
      access,
      namespace: access ? `${baseNamespace}:user:${identity}` : baseNamespace,
      // A new function on each snapshot also prompts route reconciliation.
      // Preserve inherited/custom policies unless this provider owns a store.
      canAccess: (requirement: Access) =>
        (
          config?.canAccess ??
          (config?.access ? access!.canAccess : parent.canAccess)
        )(requirement),
      fields: { ...parent.fields, ...config?.fields },
      columns: { ...parent.columns, ...config?.columns },
      rowActions: { ...parent.rowActions, ...config?.rowActions },
      sources: { ...parent.sources, ...config?.sources },
      tabsSources: { ...parent.tabsSources, ...config?.tabsSources },
      form: { ...parent.form, ...config?.form },
      table: config?.table
        ? { ...parent.table, ...config.table }
        : parent.table,
      tabs: config?.tabs ? { ...parent.tabs, ...config.tabs } : parent.tabs,
      menu: config?.menu ? { ...parent.menu, ...config.menu } : parent.menu,
    }),
    [parent, config, access, accessState, baseNamespace, identity],
  );
  return (
    <NamespaceContext value={baseNamespace}>
      <Context key={identity} value={value}>
        {children}
      </Context>
    </NamespaceContext>
  );
}
export function useAutoConfig() {
  return useContext(Context);
}
