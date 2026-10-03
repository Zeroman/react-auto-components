import { AutoTip, type TipConfig } from "../AutoTip";
import { useAutoText } from "../../core/i18n";
import {
  useId,
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Access, ComponentDensity, ComponentSize } from "../../core/types";
import { resolveHidden } from "../../core/config";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import { useLibraryStyles } from "../../core/dev";
import { Popover } from "../../internal/Popover";
import {
  type AutoRouteChildDeclaration,
  type AutoRouteConfig,
  useAutoRoute,
  useEnclosingNavigation,
  RoutePathContext,
  RouteActiveContext,
  isSubpath,
  parsePath,
} from "../../core/navigation";

export interface AutoMenuItem extends Access, TipConfig {
  /** Floating help on the menu entry. */
  tip?: ReactNode;
  /** Stable and unique across the entire menu. */
  id: string;
  label: string;
  icon?: ReactNode;
  /** Secondary line rendered under the label. */
  description?: ReactNode;
  badge?: ReactNode;
  hidden?: boolean | (() => boolean);
  /** Disables this entry and its descendants. */
  disabled?: boolean;
  /** Business content mounted when this menu entry is selected. */
  content?: ReactNode;
  /** Shortcut target; clicking calls goto without mounting duplicate content. */
  target?: string | readonly string[];
  /** Sub-menu entries; clicking a parent toggles its expansion. */
  children?: readonly AutoMenuItem[];
}

/**
 * Sidebar navigation. `value` is the selected leaf id. Omit it to use internal state starting at `defaultValue`.
 * `onChange` is not caught. A cyclic `children` list is dropped so a bad schema cannot recurse forever.
 * `collapsible` defaults to `false`. `collapsed` controls the icon rail; otherwise `defaultCollapsed` (default `false`) is used.
 * Items that are hidden, disabled by an ancestor, or rejected by `canAccess` are not rendered.
 */
export interface AutoMenuProps extends TipConfig {
  items: readonly AutoMenuItem[];
  /** Optional route configuration to participate in the AutoNavigation component tree. */
  route?: AutoRouteConfig;
  /** Selected leaf id. Pass it to control selection. */
  value?: string;
  defaultValue?: string;
  onChange?: (id: string, item: AutoMenuItem, path: readonly string[]) => void;
  /** Group label above the items; also used as the nav aria-label. */
  label?: string;
  header?: ReactNode;
  footer?: ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  size?: ComponentSize;
  density?: ComponentDensity;
  className?: string;
  style?: CSSProperties;
}

interface MenuListProps extends TipConfig {
  items: readonly AutoMenuItem[];
  depth: number;
  currentId?: string;
  selectedIds: ReadonlySet<string>;
  expanded: ReadonlyMap<string, boolean>;
  collapsed: boolean;
  size: ComponentSize;
  density: ComponentDensity;
  onToggle: (id: string) => void;
  onSelect: (item: AutoMenuItem, path: readonly AutoMenuItem[]) => void;
  path: readonly AutoMenuItem[];
}

function findPath(
  items: readonly AutoMenuItem[],
  id: string,
): readonly AutoMenuItem[] | undefined {
  for (const item of items) {
    if (item.disabled) continue;
    if (item.id === id && !item.children?.length) return [item];
    const child = item.children && findPath(item.children, id);
    if (child) return [item, ...child];
  }
}

function firstPath(items: readonly AutoMenuItem[]): readonly AutoMenuItem[] {
  for (const item of items) {
    if (item.disabled) continue;
    if (!item.children?.length) return [item];
    const child = firstPath(item.children);
    if (child.length) return [item, ...child];
  }
  return [];
}

// Keep ordinary navigation semantics and Tab order; arrows are a convenience.
function navigate(event: KeyboardEvent<HTMLElement>) {
  const target = event.target;
  if (
    !(target instanceof HTMLButtonElement) ||
    !target.hasAttribute("data-auto-menu-item")
  )
    return;
  const buttons = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      "button[data-auto-menu-item]:not(:disabled)",
    ),
  ];
  const index = buttons.indexOf(target);
  if (index < 0) return; // A portal handles its own keyboard events.
  let next: HTMLButtonElement | undefined;
  if (event.key === "ArrowDown") next = buttons[(index + 1) % buttons.length];
  else if (event.key === "ArrowUp")
    next = buttons[(index - 1 + buttons.length) % buttons.length];
  else if (event.key === "Home") next = buttons[0];
  else if (event.key === "End") next = buttons.at(-1);
  else if (event.key === "ArrowRight" && target.hasAttribute("aria-expanded")) {
    if (target.getAttribute("aria-expanded") === "false") target.click();
    else
      next =
        target.nextElementSibling?.querySelector<HTMLButtonElement>(
          "button:not(:disabled)",
        ) ?? undefined;
    event.preventDefault();
  } else if (event.key === "ArrowLeft") {
    if (target.getAttribute("aria-expanded") === "true") {
      target.click();
      event.preventDefault();
    } else
      next =
        target
          .closest("li")
          ?.parentElement?.closest("li")
          ?.querySelector<HTMLButtonElement>("button") ?? undefined;
  }
  if (next) {
    event.preventDefault();
    next.focus();
  }
}

function MenuItem({
  item,
  ...list
}: Omit<MenuListProps, "items"> & { item: AutoMenuItem }) {
  const submenuId = useId();
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const {
    collapsed,
    currentId,
    expanded,
    selectedIds,
    path,
    depth,
    onToggle,
    onSelect,
    size,
    density,
    tipComponent,
  } = list;
  const hasChildren = !!item.children?.length;
  useEffect(() => setFlyoutOpen(false), [collapsed, item.disabled]);
  const isExpanded = expanded.get(item.id) ?? selectedIds.has(item.id);
  const active = item.id === currentId;
  const nextPath = [...path, item];
  const button = (
    <button
      type="button"
      data-auto-menu-item=""
      className={active ? "active" : undefined}
      data-active-branch={
        hasChildren && selectedIds.has(item.id) ? "true" : undefined
      }
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      aria-expanded={
        hasChildren
          ? collapsed
            ? flyoutOpen && !item.disabled
            : isExpanded
          : undefined
      }
      aria-controls={
        hasChildren
          ? collapsed
            ? `${submenuId}-flyout`
            : isExpanded
              ? submenuId
              : undefined
          : undefined
      }
      disabled={item.disabled}
      onClick={() => {
        if (!hasChildren) onSelect(item, nextPath);
        else if (!collapsed) onToggle(item.id);
      }}
    >
      {(item.icon != null || collapsed) && (
        <span className="auto-menu-icon" aria-hidden="true">
          {item.icon ?? Array.from(item.label.trim())[0] ?? "•"}
        </span>
      )}
      {!collapsed && (
        <span className="auto-menu-text">
          {item.label}
          {item.description != null && <small>{item.description}</small>}
        </span>
      )}
      {!collapsed && item.badge != null && (
        <span className="auto-menu-badge">{item.badge}</span>
      )}
      {!collapsed && hasChildren && (
        <span
          className={`auto-menu-arrow${isExpanded ? " auto-menu-arrow-open" : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
      )}
    </button>
  );
  return (
    <li className="auto-menu-item">
      {hasChildren && collapsed ? (
        <Popover
          tip={item.tip ?? item.label}
          tipComponent={item.tipComponent ?? tipComponent}
          placement="right-start"
          open={flyoutOpen && !item.disabled}
          onOpenChange={setFlyoutOpen}
          content={
            <div
              id={`${submenuId}-flyout`}
              className="auto-root auto-menu auto-menu-flyout"
              data-size={size}
              data-density={density}
              onKeyDown={(event) => {
                navigate(event);
                if (event.key === "ArrowLeft" && !event.defaultPrevented) {
                  event.preventDefault();
                  setFlyoutOpen(false);
                }
              }}
            >
              <div className="auto-menu-label">{item.label}</div>
              <MenuList
                {...list}
                items={item.children!}
                depth={depth + 1}
                path={nextPath}
                collapsed={false}
                onSelect={(child, childPath) => {
                  onSelect(child, childPath);
                  setFlyoutOpen(false);
                }}
              />
            </div>
          }
        >
          {button}
        </Popover>
      ) : (
        <AutoTip
          content={item.tip ?? (collapsed ? item.label : undefined)}
          tipComponent={item.tipComponent ?? tipComponent}
        >
          {button}
        </AutoTip>
      )}
      {hasChildren && !collapsed && isExpanded && (
        <div id={submenuId}>
          <MenuList
            {...list}
            items={item.children!}
            depth={depth + 1}
            path={nextPath}
          />
        </div>
      )}
    </li>
  );
}

function MenuList({ items, ...props }: MenuListProps) {
  return (
    <ul className="auto-menu-list" data-depth={props.depth}>
      {items.map((item) => (
        <MenuItem key={item.id} item={item} {...props} />
      ))}
    </ul>
  );
}

/** The leaf whose `target` is the longest prefix of the current path. */
function findTargetPath(
  list: readonly AutoMenuItem[],
  navPath: readonly string[],
): readonly AutoMenuItem[] | undefined {
  let best: readonly AutoMenuItem[] | undefined;
  let bestLength = 0;
  (function walk(
    entries: readonly AutoMenuItem[],
    trail: readonly AutoMenuItem[],
  ) {
    for (const item of entries) {
      if (item.disabled) continue;
      if (item.children?.length) {
        walk(item.children, [...trail, item]);
        continue;
      }
      if (!item.target) continue;
      const target = parsePath(item.target);
      if (target.length > bestLength && isSubpath(target, navPath)) {
        best = [...trail, item];
        bestLength = target.length;
      }
    }
  })(list, []);
  return best;
}

const isHidden = resolveHidden;

/**
 * A menu is one route level: groups only organize entries, so every leaf is a
 * direct child segment and inherits its ancestors' disabled, hidden, and access rules.
 */
function routeChildren(
  list: readonly AutoMenuItem[],
  parent?: AutoRouteChildDeclaration,
  ancestors: ReadonlySet<string> = new Set(),
): AutoRouteChildDeclaration[] {
  if (list.some((item) => ancestors.has(item.id))) return [];
  return list.flatMap((item) => {
    const parentHidden = parent?.hidden;
    const roles = [...(parent?.roles ?? []), ...(item.roles ?? [])];
    const permissions = [
      ...(parent?.permissions ?? []),
      ...(item.permissions ?? []),
    ];
    const entry: AutoRouteChildDeclaration = {
      id: item.id,
      label: item.label,
      disabled: !!(parent?.disabled || item.disabled),
      hidden:
        parentHidden === undefined
          ? item.hidden
          : () => isHidden(parentHidden) || isHidden(item.hidden),
      roles: roles.length ? roles : undefined,
      permissions: permissions.length ? permissions : undefined,
      target: item.target,
    };
    return item.children?.length
      ? routeChildren(item.children, entry, new Set(ancestors).add(item.id))
      : [entry];
  });
}

export function AutoMenu({
  items,
  route,
  value,
  defaultValue,
  onChange,
  label,
  header,
  footer,
  collapsible = false,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  size: ownSize,
  density: ownDensity,
  tipComponent: ownTipComponent,
  className,
  style,
}: AutoMenuProps) {
  const tr = useAutoText();
  const services = useAutoConfig();
  useLibraryStyles();
  const nav = useEnclosingNavigation();

  const routeConfig = route
    ? {
        ...route,
        children: routeChildren(items),
      }
    : undefined;

  const routeContext = useAutoRoute(routeConfig);

  const density =
    ownDensity ?? services.menu?.density ?? services.density ?? "comfortable";
  const tipComponent = ownTipComponent ?? services.menu?.tipComponent;
  const size = ownSize ?? services.menu?.size ?? services.size ?? "medium";
  const [local, setLocal] = useState<string | undefined>(defaultValue);
  const [collapsedLocal, setCollapsedLocal] = useState(defaultCollapsed);
  const [expanded, setExpanded] = useState<ReadonlyMap<string, boolean>>(
    new Map(),
  );
  const isCollapsed = collapsed ?? collapsedLocal;
  const visible = (function walk(
    list: readonly AutoMenuItem[],
    parentDisabled = false,
    ancestors: ReadonlySet<string> = new Set(),
  ): readonly AutoMenuItem[] {
    // Reject a cyclic child list as a whole so sibling entries cannot be
    // duplicated under the invalid branch.
    if (list.some((item) => ancestors.has(item.id))) return [];
    return list.flatMap((item) => {
      if (
        resolveHidden(item.hidden) ||
        !services.canAccess(item) ||
        ancestors.has(item.id)
      )
        return [];
      const disabled = parentDisabled || item.disabled;
      if (item.children?.length) {
        // Items can arrive from remote schemas; skip entries that point back
        // to an ancestor so poisoned data cannot recurse into a stack overflow.
        const children = walk(
          item.children,
          disabled,
          new Set(ancestors).add(item.id),
        );
        return children.length ? [{ ...item, disabled, children }] : [];
      }
      return [disabled === item.disabled ? item : { ...item, disabled }];
    });
  })(items);

  const navMatch =
    (route && routeContext.activeChild
      ? findPath(visible, routeContext.activeChild)
      : undefined) ??
    (nav ? findTargetPath(visible, routeContext.path) : undefined);

  const selectedPath =
    value !== undefined
      ? (findPath(visible, value) ?? [])
      : (navMatch ?? findPath(visible, local ?? "") ?? firstPath(visible));
  const selectionPathIds = selectedPath.map((item) => item.id);
  const selectedIds = new Set(selectionPathIds);
  const currentId = selectedPath.at(-1)?.id;
  const selectionKey = JSON.stringify(selectionPathIds);
  useEffect(() => {
    const ancestors = selectionPathIds.slice(0, -1);
    if (ancestors.length) {
      setExpanded((state) => {
        const next = new Map(state);
        for (const id of ancestors) next.set(id, true);
        return next;
      });
    }
  }, [selectionKey]);
  function select(item: AutoMenuItem, path: readonly AutoMenuItem[]) {
    if (item.target && nav) {
      nav.goto(item.target);
      onChange?.(
        item.id,
        item,
        path.map((entry) => entry.id),
      );
      return;
    }
    if (route) {
      routeContext.goto(`./${item.id}`);
      onChange?.(
        item.id,
        item,
        path.map((entry) => entry.id),
      );
      return;
    }
    if (value === undefined) setLocal(item.id);
    onChange?.(
      item.id,
      item,
      path.map((entry) => entry.id),
    );
  }

  const hasAnyContent = (function checkContent(
    list: readonly AutoMenuItem[],
    ancestors = new Set<string>(),
  ): boolean {
    return list.some((i) => {
      if (ancestors.has(i.id)) return false;
      if (i.content != null) return true;
      if (i.children?.length) {
        return checkContent(i.children, new Set(ancestors).add(i.id));
      }
      return false;
    });
  })(items);

  const selectedItem = selectedPath.at(-1);

  const navElement = (
    <nav
      className={`auto-root auto-menu${isCollapsed ? " auto-menu-collapsed" : ""}${className ? ` ${className}` : ""}`}
      data-size={size}
      data-density={density}
      data-collapsed={isCollapsed ? "true" : undefined}
      aria-label={label ?? tr("Navigation")}
      style={style}
      onKeyDown={navigate}
    >
      {header != null && <div className="auto-menu-header">{header}</div>}
      {label != null && !isCollapsed && (
        <div className="auto-menu-label">{label}</div>
      )}
      <MenuList
        tipComponent={tipComponent}
        items={visible}
        depth={0}
        currentId={currentId}
        selectedIds={selectedIds}
        expanded={expanded}
        collapsed={isCollapsed}
        size={size}
        density={density}
        onToggle={(id) =>
          setExpanded((state) =>
            new Map(state).set(id, !(state.get(id) ?? selectedIds.has(id))),
          )
        }
        onSelect={select}
        path={[]}
      />
      {collapsible && (
        <button
          type="button"
          className="auto-menu-collapse-btn"
          aria-label={isCollapsed ? tr("Expand menu") : tr("Collapse menu")}
          aria-expanded={!isCollapsed}
          onClick={() => {
            const next = !isCollapsed;
            if (collapsed === undefined) setCollapsedLocal(next);
            onCollapsedChange?.(next);
          }}
        >
          {isCollapsed ? "»" : "«"}
        </button>
      )}
      {footer != null && <div className="auto-menu-footer">{footer}</div>}
    </nav>
  );

  if (hasAnyContent) {
    return (
      <div className="auto-root auto-menu-container">
        {navElement}
        <div className="auto-menu-content">
          {selectedItem?.content && (
            <RoutePathContext
              value={[...routeContext.nodePath, selectedItem.id]}
            >
              <RouteActiveContext value={true}>
                {selectedItem.content}
              </RouteActiveContext>
            </RoutePathContext>
          )}
        </div>
      </div>
    );
  }

  return navElement;
}
