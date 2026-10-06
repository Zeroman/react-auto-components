import { Fragment, type ReactElement, type ReactNode } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";

/**
 * Shared shape for right-click menu entries (table rows, tabs, …).
 * `hidden` filters an entry out; `disabled` renders it inert.
 */
export interface MenuAction<T> {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  separator?: boolean;
  disabled?: (item: T) => boolean;
  hidden?: (item: T) => boolean;
}

/** Right-click menu around any element, driven by per-item actions. */
export function ActionContextMenu<
  T,
  A extends MenuAction<T> = MenuAction<T>,
>({
  actions,
  item,
  onOpenChange,
  onSelect,
  children,
}: {
  actions?: readonly A[];
  item: T | null;
  onOpenChange?: (open: boolean) => void;
  onSelect: (action: A, item: T) => void;
  children: ReactElement;
}) {
  if (!actions?.length) return children;
  const visible = item ? actions.filter((action) => !action.hidden?.(item)) : [];
  return (
    <ContextMenu.Root onOpenChange={onOpenChange}>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      {visible.length > 0 && (
        <ContextMenu.Portal>
          <ContextMenu.Content className="auto-popover auto-context-menu">
            {visible.map((action, idx) => (
              <Fragment key={action.id}>
                {action.separator && idx > 0 && (
                  <ContextMenu.Separator className="auto-context-menu-separator" />
                )}
                <ContextMenu.Item
                  className={
                    action.danger ? "auto-context-menu-danger" : undefined
                  }
                  disabled={item ? action.disabled?.(item) : undefined}
                  onSelect={() => {
                    if (item) onSelect(action, item);
                  }}
                >
                  {action.icon && (
                    <span className="auto-context-menu-icon" aria-hidden="true">
                      {action.icon}
                    </span>
                  )}
                  <span className="auto-context-menu-label">
                    {action.label}
                  </span>
                </ContextMenu.Item>
              </Fragment>
            ))}
          </ContextMenu.Content>
        </ContextMenu.Portal>
      )}
    </ContextMenu.Root>
  );
}
