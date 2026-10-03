import * as ContextMenu from "@radix-ui/react-context-menu";
import type { CSSProperties, ReactElement } from "react";
import type { AutoColumn, RowAction, TableToolbarActions } from "./types";

/** Computes sticky column styles for pinned columns. */
export function stickyColumnStyles<T extends object>(
  columns: readonly AutoColumn<T>[],
  pin: Record<string, "left" | "right" | null | undefined>,
  widths: Record<string, number>,
): Map<string, CSSProperties> {
  const widthOf = (column: AutoColumn<T>) =>
    widths[column.key] ?? column.width ?? 150;
  const left: AutoColumn<T>[] = [];
  const right: AutoColumn<T>[] = [];
  for (const column of columns) {
    const side = pin[column.key];
    if (side === "left") left.push(column);
    else if (side === "right") right.push(column);
  }
  const offset = new Map<string, number>();
  let leftEdge = 44;
  for (const column of left) {
    offset.set(column.key, leftEdge);
    leftEdge += widthOf(column);
  }
  let rightEdge = 0;
  for (let index = right.length - 1; index >= 0; index -= 1) {
    offset.set(right[index].key, rightEdge);
    rightEdge += widthOf(right[index]);
  }
  const styles = new Map<string, CSSProperties>();
  for (const column of columns) {
    const columnWidth = widthOf(column);
    const side = pin[column.key];
    styles.set(column.key, {
      width: columnWidth,
      minWidth: columnWidth,
      maxWidth: columnWidth,
      textAlign: column.align ?? "left",
      ...(side
        ? {
            position: "sticky" as const,
            zIndex: 2,
            [side]: offset.get(column.key),
            background: "var(--auto-bg)",
          }
        : {}),
    });
  }
  return styles;
}

/** Context menu wrapper for table rows. */
export function RowContextMenu<T extends object>({
  actions,
  row,
  onOpenChange,
  onSelect,
  children,
}: {
  actions?: readonly RowAction<T>[];
  row: T | null;
  onOpenChange: (open: boolean) => void;
  onSelect: (action: RowAction<T>, row: T) => void;
  children: ReactElement;
}) {
  if (!actions?.length) return children;
  const visible = row ? actions.filter((action) => !action.hidden?.(row)) : [];
  return (
    <ContextMenu.Root onOpenChange={onOpenChange}>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="auto-popover auto-context-menu">
          {visible.map((action) => (
            <ContextMenu.Item
              key={action.id}
              disabled={row ? action.disabled?.(row) : undefined}
              onSelect={() => {
                if (row) onSelect(action, row);
              }}
            >
              {action.label}
            </ContextMenu.Item>
          ))}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

/** Helper to test whether a toolbar action button is enabled. */
export function showToolbarAction(
  actions: boolean | TableToolbarActions | undefined,
  key: keyof TableToolbarActions,
): boolean {
  if (actions === false) return false;
  if (actions == null || actions === true) return true;
  return actions[key] !== false;
}
