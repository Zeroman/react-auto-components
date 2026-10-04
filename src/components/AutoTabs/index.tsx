import { AutoTip, type TipConfig } from "../AutoTip";
import { useAutoText } from "../../core/i18n";
import * as Tabs from "@radix-ui/react-tabs";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Access, ComponentDensity, ComponentSize } from "../../core/types";
import { errorMessage, resolveHidden } from "../../core/config";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import { useLibraryStyles } from "../../core/dev";
import { devWarn, racMessage } from "../../core/errors";
import type { TabsSource } from "../../core/registry";
import {
  type AutoRouteConfig,
  useAutoRoute,
  RoutePathContext,
  RouteActiveContext,
} from "../../core/navigation";
export * from "./useAutoTabsWorkspace";
export interface AutoTab extends Access, TipConfig {
  /** Help shown on hover or focus without changing the tab layout. */
  tip?: ReactNode;
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
  hidden?: boolean | (() => boolean);
  disabled?: boolean;
  content?: ReactNode;
  /** A nested tab group rendered inside this tab's content panel. */
  children?: readonly AutoTab[];
  loading?: boolean;
  onRefresh?: () => void;
  defaultActive?: string;
  /** Shows a close button when the group also supplies `onClose`. */
  closable?: boolean;
}
/**
 * Tab list. `value` is the path of selected ids from the root, so nested tabs are `["parent", "child"]`.
 * `mode` defaults to `"horizontal"`. `keepMounted` defaults to `true` (hidden panels stay mounted; `false` unmounts them).
 * `onChange` and `onRefresh` are not caught. A throw leaves the previously selected tab in place only if you never committed the change.
 * Disabled tabs are skipped when choosing the default selection. Hidden tabs and failed `canAccess` are removed.
 */
export interface AutoTabsProps extends TipConfig {
  /** Local tab items. Pass exactly one of `items` and `source`. */
  items?: readonly AutoTab[];
  /**
   * Loads items remotely: a `({ signal }) => Promise<AutoTab[]>` function or a
   * `config.tabsSources` key. Keep a function source stable (`useCallback`) —
   * a new identity refetches. A rejection shows `error.message` with Retry.
   * An unknown key shows `RAC-TABS-SOURCE`.
   */
  source?: TabsSource | string;
  /** Optional route configuration to participate in the AutoNavigation component tree. */
  route?: AutoRouteConfig;
  /** Controlled selection path. Omit to let the tabs keep state from `defaultValue`. */
  value?: readonly string[];
  defaultValue?: readonly string[];
  /** Fires with the full path and the tab that was chosen. Not caught if it throws. */
  onChange?: (path: readonly string[], item: AutoTab) => void;
  /** Tab orientation. Use AutoMenu for hierarchical navigation. Default `"horizontal"`. */
  mode?: "horizontal" | "vertical";
  /**
   * Default `true`: inactive panels stay mounted and keep state.
   * `false` unmounts them, so local state inside panel content is destroyed.
   */
  keepMounted?: boolean;
  /** Mount a panel on its first visit. Combine with `keepMounted` to retain visited panels. Default `false`. */
  lazy?: boolean;
  /** Requests removal; the owner must update `items`. Nested groups report the full path. */
  onClose?: (path: readonly string[], item: AutoTab) => void;
  extra?: ReactNode;
  size?: ComponentSize;
  density?: ComponentDensity;
}
export function AutoTabs({
  items,
  source,
  route,
  value,
  defaultValue,
  onChange,
  mode = "horizontal",
  keepMounted = true,
  lazy = false,
  onClose,
  extra,
  tipComponent: ownTipComponent,
  size: ownSize,
  density: ownDensity,
}: AutoTabsProps) {
  const tr = useAutoText();
  const services = useAutoConfig();
  useLibraryStyles();

  if (items !== undefined && source !== undefined) {
    devWarn(
      "AutoTabs",
      "RAC-TABS-SOURCE",
      "Both items and source were supplied to AutoTabs.",
      "Pass exactly one: local items, a source function, or a config.tabsSources key. items wins.",
    );
  }
  const tabsSource =
    typeof source === "function"
      ? source
      : source === undefined || items !== undefined
        ? undefined
        : (services.tabsSources[source] ??
          (() =>
            Promise.reject(
              new Error(
                racMessage(
                  "AutoTabs",
                  "RAC-TABS-SOURCE",
                  `source "${source}" is not registered.`,
                  `Add config.tabsSources["${source}"] on AutoConfigProvider, or pass items or a function.`,
                ),
              ),
            )));
  const tabs = useTabsItems(items, tabsSource);

  if (route && value !== undefined) {
    devWarn(
      "AutoTabs",
      "RAC-TABS-ROUTE-VALUE",
      "Both route and value were supplied to AutoTabs.",
      "Omit value when using route-driven navigation; route owns tab selection.",
    );
  }

  const routeConfig = route
    ? {
        ...route,
        children: tabs.items.map((tab) => ({
          id: tab.id,
          disabled: tab.disabled,
          hidden: tab.hidden,
          roles: tab.roles,
          permissions: tab.permissions,
          awaitRegistration: !!tab.children?.length,
        })),
      }
    : undefined;

  const routeContext = useAutoRoute(routeConfig);

  const density =
    ownDensity ?? services.tabs?.density ?? services.density ?? "comfortable";
  const tipComponent = ownTipComponent ?? services.tabs?.tipComponent;
  const size = ownSize ?? services.tabs?.size ?? services.size ?? "medium";
  const visible = tabs.items.filter(
    (i) => !resolveHidden(i.hidden) && services.canAccess(i),
  );
  const [local, setLocal] = useState<readonly string[]>(defaultValue ?? []);
  const path = value ?? local;
  // Reconcile a removed selection: when the uncontrolled selection points at a
  // tab that is gone, hidden, disabled or inaccessible, drop it so the default
  // fallback picks the first available tab instead of resurrecting it later.
  useEffect(() => {
    if (route || value !== undefined) return;
    if (
      local.length &&
      !visible.some((i) => i.id === local[0] && !i.disabled)
    ) {
      const fallback = visible.find((i) => !i.disabled);
      setLocal(fallback ? [fallback.id] : []);
    }
  }, [route, value, local, visible]);
  const selected = route
    ? (visible.find((i) => i.id === routeContext.activeChild && !i.disabled) ??
      visible.find((i) => i.id === route.defaultChild && !i.disabled) ??
      visible.find((i) => !i.disabled))
    : (visible.find((i) => i.id === path[0] && !i.disabled) ??
      visible.find((i) => !i.disabled));
  const current = selected?.id ?? "";
  function change(next: readonly string[], item: AutoTab) {
    if (route) {
      routeContext.goto(`./${next[0]}`);
      onChange?.(next, item);
      return;
    }
    if (value === undefined) setLocal(next);
    onChange?.(next, item);
  }
  if (tabs.loading)
    return (
      <p className="auto-notice" role="status">
        {tr("Loading…")}
      </p>
    );
  if (tabs.error)
    return (
      <div className="auto-error" role="alert">
        {tabs.error}{" "}
        <button type="button" onClick={tabs.retry}>
          {tr("Retry")}
        </button>
      </div>
    );
  return (
    <Tabs.Root
      className={`auto-root auto-tabs auto-tabs-${mode}`}
      data-size={size}
      data-density={density}
      value={current}
      onValueChange={(v) => {
        const item = visible.find((i) => i.id === v);
        if (item) change([v], item);
      }}
      orientation={mode === "horizontal" ? "horizontal" : "vertical"}
    >
      <div className="auto-tabs-heading">
        <Tabs.List aria-label={tr("Tabs")} className="auto-tab-list">
          {visible.map((i) => (
            <div key={i.id} className="auto-tab-entry">
              <AutoTip
                content={i.tip}
                tipComponent={i.tipComponent ?? tipComponent}
              >
                <Tabs.Trigger
                  value={i.id}
                  disabled={i.disabled}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Delete" &&
                      i.closable &&
                      onClose &&
                      !i.disabled
                    ) {
                      event.preventDefault();
                      onClose([i.id], i);
                    }
                  }}
                >
                  {i.icon}
                  {i.label}
                  {i.badge != null && (
                    <span className="auto-tab-badge">{i.badge}</span>
                  )}
                  {i.loading ? " …" : ""}
                </Tabs.Trigger>
              </AutoTip>
              {i.closable && onClose && (
                <button
                  type="button"
                  className="auto-tab-close"
                  aria-label={tr("Close {0}", [i.label])}
                  disabled={i.disabled}
                  onClick={() => onClose([i.id], i)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </Tabs.List>
        {extra}
      </div>
      {visible.map((i) => {
        const isCurrent = i.id === current;
        const childRoutePath = route
          ? [...routeContext.nodePath, i.id]
          : undefined;
        const panelContent = (
          <>
            {i.onRefresh && (
              <button onClick={i.onRefresh}>
                {tr("Refresh {0}", [i.label])}
              </button>
            )}
            {i.children ? (
              <AutoTabs
                items={i.children}
                route={route ? { defaultChild: i.defaultActive } : undefined}
                tipComponent={tipComponent}
                value={
                  !route && isCurrent && path.length > 1
                    ? path.slice(1)
                    : undefined
                }
                defaultValue={i.defaultActive ? [i.defaultActive] : undefined}
                keepMounted={keepMounted}
                lazy={lazy}
                onClose={
                  onClose
                    ? (next, item) => onClose([i.id, ...next], item)
                    : undefined
                }
                size={size}
                density={density}
                onChange={
                  route
                    ? (next, item) => onChange?.([i.id, ...next], item)
                    : (next, item) => change([i.id, ...next], item)
                }
              />
            ) : (
              i.content
            )}
          </>
        );

        return (
          <VisitedPanel
            key={i.id}
            active={isCurrent}
            lazy={lazy}
            keepMounted={keepMounted}
          >
            <Tabs.Content
              value={i.id}
              forceMount={keepMounted ? true : undefined}
              hidden={!isCurrent}
              className="auto-tab-content"
            >
              {childRoutePath ? (
                <RoutePathContext value={childRoutePath}>
                  <RouteActiveContext value={isCurrent}>
                    {panelContent}
                  </RouteActiveContext>
                </RoutePathContext>
              ) : (
                panelContent
              )}
            </Tabs.Content>
          </VisitedPanel>
        );
      })}
    </Tabs.Root>
  );
}

function useTabsItems(
  items: readonly AutoTab[] | undefined,
  source: TabsSource | undefined,
): {
  items: readonly AutoTab[];
  loading: boolean;
  error: string;
  retry: () => void;
} {
  const [loaded, setLoaded] = useState<readonly AutoTab[]>([]);
  const [loading, setLoading] = useState(!!source && items === undefined);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const enabled = !!source && items === undefined;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.resolve()
      .then(() => sourceRef.current!({ signal: controller.signal }))
      .then((list) => {
        if (!controller.signal.aborted)
          setLoaded(Array.isArray(list) ? (list as readonly AutoTab[]) : []);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, version, source]);
  return {
    items: items ?? loaded,
    loading: enabled && loading,
    error: enabled ? error : "",
    retry: useCallback(() => setVersion((v) => v + 1), []),
  };
}

function VisitedPanel({
  active,
  lazy,
  keepMounted,
  children,
}: {
  active: boolean;
  lazy: boolean;
  keepMounted: boolean;
  children: ReactNode;
}) {
  const [visited, setVisited] = useState(active);
  useEffect(() => {
    if (active) setVisited(true);
  }, [active]);
  return active || (keepMounted && (!lazy || visited)) ? children : null;
}
