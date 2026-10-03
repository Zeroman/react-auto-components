import type { TipConfig } from "./tip";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { safeStorage } from "./config";
import type { ColumnRegistry, SourceLoader } from "./registry";
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
};
const Context = createContext(defaultServices);
export function AutoConfigProvider({
  config,
  children,
}: {
  config?: Partial<AutoServices>;
  children: ReactNode;
}) {
  const parent = useContext(Context);
  const value = useMemo(
    () => ({
      ...parent,
      ...config,
      fields: { ...parent.fields, ...config?.fields },
      columns: { ...parent.columns, ...config?.columns },
      rowActions: { ...parent.rowActions, ...config?.rowActions },
      sources: { ...parent.sources, ...config?.sources },
      form: { ...parent.form, ...config?.form },
      table: config?.table
        ? { ...parent.table, ...config.table }
        : parent.table,
      tabs: config?.tabs ? { ...parent.tabs, ...config.tabs } : parent.tabs,
      menu: config?.menu ? { ...parent.menu, ...config.menu } : parent.menu,
    }),
    [parent, config],
  );
  return <Context value={value}>{children}</Context>;
}
export function useAutoConfig() {
  return useContext(Context);
}
