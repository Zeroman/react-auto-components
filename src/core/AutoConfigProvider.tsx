import { createContext, useContext, useMemo, type ReactNode } from "react";
import { safeStorage } from "./config";
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
export interface TableGlobalConfig {
  density?: TableDensity;
  size?: ComponentSize;
}
export interface TabsGlobalConfig {
  density?: ComponentDensity;
  size?: ComponentSize;
}
export interface MenuGlobalConfig {
  density?: ComponentDensity;
  size?: ComponentSize;
}
export interface AutoServices {
  namespace: string;
  size?: ComponentSize;
  density?: ComponentDensity;
  table?: TableGlobalConfig;
  tabs?: TabsGlobalConfig;
  menu?: MenuGlobalConfig;
  form: AutoFormLayout;
  t: (key: string, fallback?: string) => string;
  canAccess: (access: Access) => boolean;
  storage: StorageAdapter;
  settings?: SettingsAdapter;
  notify: (message: string, level: "success" | "error") => void;
  fields: Record<string, (context: FieldContext<Values>) => ReactNode>;
}
const defaultServices: AutoServices = {
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
