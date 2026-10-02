import { useAutoText } from "../../core/i18n";
import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useState, type ReactNode } from "react";
import type { Access, ComponentDensity, ComponentSize } from "../../core/types";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import { useLibraryStyles } from "../../core/dev";
export * from "./useAutoTabsWorkspace";
export interface AutoTab extends Access {
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
export interface AutoTabsProps {
  items: readonly AutoTab[];
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
  value,
  defaultValue,
  onChange,
  mode = "horizontal",
  keepMounted = true,
  lazy = false,
  onClose,
  extra,
  size: ownSize,
  density: ownDensity,
}: AutoTabsProps) {
  const tr = useAutoText();
  const services = useAutoConfig();
  useLibraryStyles();
  const density =
    ownDensity ?? services.tabs?.density ?? services.density ?? "comfortable";
  const size = ownSize ?? services.tabs?.size ?? services.size ?? "medium";
  const visible = items.filter(
    (i) =>
      !(typeof i.hidden === "function" ? i.hidden() : i.hidden) &&
      services.canAccess(i),
  );
  const [local, setLocal] = useState<readonly string[]>(defaultValue ?? []);
  const path = value ?? local;
  const selected =
    visible.find((i) => i.id === path[0] && !i.disabled) ??
    visible.find((i) => !i.disabled);
  const current = selected?.id ?? "";
  function change(next: readonly string[], item: AutoTab) {
    if (value === undefined) setLocal(next);
    onChange?.(next, item);
  }
  return (
    <Tabs.Root
      className={`auto-root auto-tabs auto-tabs-${mode}`}
      data-size={size}
      data-density={density}
      value={current}
      onValueChange={(v) => {
        const item = visible.find((i) => i.id === v)!;
        change([v], item);
      }}
      orientation={mode === "horizontal" ? "horizontal" : "vertical"}
    >
      <div className="auto-tabs-heading">
        <Tabs.List aria-label={tr("Tabs")} className="auto-tab-list">
          {visible.map((i) => (
            <div key={i.id} className="auto-tab-entry">
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
      {visible.map((i) => (
        <VisitedPanel
          key={i.id}
          active={i.id === current}
          lazy={lazy}
          keepMounted={keepMounted}
        >
          <Tabs.Content
            value={i.id}
            forceMount={keepMounted ? true : undefined}
            hidden={i.id !== current}
            className="auto-tab-content"
          >
            {i.onRefresh && (
              <button onClick={i.onRefresh}>
                {tr("Refresh {0}", [i.label])}
              </button>
            )}
            {i.children ? (
              <AutoTabs
                items={i.children}
                value={
                  i.id === current && path.length > 1
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
                onChange={(next, item) => change([i.id, ...next], item)}
              />
            ) : (
              i.content
            )}
          </Tabs.Content>
        </VisitedPanel>
      ))}
    </Tabs.Root>
  );
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
