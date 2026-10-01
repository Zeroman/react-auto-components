import { useAutoText } from "../../core/i18n";
import * as Tabs from "@radix-ui/react-tabs";
import { useState, type ReactNode } from "react";
import type { Access, ComponentDensity, ComponentSize } from "../../core/types";
import { useAutoConfig } from "../../core/AutoConfigProvider";
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
}
export interface AutoTabsProps {
  items: readonly AutoTab[];
  value?: readonly string[];
  defaultValue?: readonly string[];
  onChange?: (path: readonly string[], item: AutoTab) => void;
  /** Tab orientation. Use AutoMenu for hierarchical navigation. */
  mode?: "horizontal" | "vertical";
  keepMounted?: boolean;
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
  extra,
  size: ownSize,
  density: ownDensity,
}: AutoTabsProps) {
  const tr = useAutoText();
  const services = useAutoConfig();
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
        <Tabs.List aria-label={tr("页面标签")} className="auto-tab-list">
          {visible.map((i) => (
            <Tabs.Trigger key={i.id} value={i.id} disabled={i.disabled}>
              {i.icon}
              {i.label}
              {i.badge != null && (
                <span className="auto-tab-badge">{i.badge}</span>
              )}
              {i.loading ? " …" : ""}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {extra}
      </div>
      {visible.map((i) => (
        <Tabs.Content
          key={i.id}
          value={i.id}
          forceMount={keepMounted ? true : undefined}
          hidden={i.id !== current}
          className="auto-tab-content"
        >
          {i.onRefresh && (
            <button onClick={i.onRefresh}>{tr("刷新 {0}", [i.label])}</button>
          )}
          {i.children ? (
            <AutoTabs
              items={i.children}
              value={
                i.id === current && path.length > 1 ? path.slice(1) : undefined
              }
              defaultValue={i.defaultActive ? [i.defaultActive] : undefined}
              keepMounted={keepMounted}
              size={size}
              density={density}
              onChange={(next, item) => change([i.id, ...next], item)}
            />
          ) : (
            i.content
          )}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
