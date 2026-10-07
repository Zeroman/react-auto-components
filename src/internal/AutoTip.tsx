import {
  autoUpdate,
  flip,
  shift,
  offset,
  useFloating,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  useMergeRefs,
  FloatingPortal,
  safePolygon,
} from "@floating-ui/react";
import { cloneElement, useEffect, useState } from "react";
import { useAutoConfig } from "../core/AutoConfigProvider";
import { useLibraryStyles } from "../core/dev";
import type { AutoTipProps, TipConfig } from "../core/tip";
export type { AutoTipProps, TipComponent, TipConfig } from "../core/tip";

const dismissals = new WeakMap<Window, ((event: KeyboardEvent) => void)[]>();

/** A floating, accessible default; reuse it inside a custom tip if desired. */
export function DefaultTip({
  content,
  children,
  placement = "top",
}: AutoTipProps) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const interactions = useInteractions([
    useHover(context, { move: false, handleClose: safePolygon() }),
    useFocus(context, { visibleOnly: false }),
    useDismiss(context, { escapeKey: false }),
    useRole(context, { role: "tooltip" }),
  ]);
  const ref = useMergeRefs([refs.setReference, children.props.ref]);
  useEffect(() => {
    if (!open) return;
    const view = refs.domReference.current?.ownerDocument.defaultView;
    if (!view) return;
    const dismiss = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.isComposing ||
        event.defaultPrevented ||
        dismissals.get(view)?.at(-1) !== dismiss
      )
        return;
      // Radix dialogs capture Escape on document. Dismiss the topmost tip first.
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(false);
    };
    const stack = dismissals.get(view) ?? [];
    stack.push(dismiss);
    dismissals.set(view, stack);
    view.addEventListener("keydown", dismiss, true);
    return () => {
      view.removeEventListener("keydown", dismiss, true);
      const index = stack.indexOf(dismiss);
      if (index >= 0) stack.splice(index, 1);
      if (!stack.length) dismissals.delete(view);
    };
  }, [open, refs.domReference]);
  const triggerProps = interactions.getReferenceProps(children.props);
  const describedBy =
    [
      ...new Set(
        [
          children.props["aria-describedby"],
          interactions.getReferenceProps()["aria-describedby"],
        ]
          .filter(Boolean)
          .flatMap((value) => String(value).split(/\s+/)),
      ),
    ].join(" ") || undefined;
  return (
    <>
      {cloneElement(children, {
        ...triggerProps,
        "aria-describedby": describedBy,
        ref,
      })}
      {open && (
        <FloatingPortal
          root={
            refs.domReference.current?.closest<HTMLElement>(
              '[role="dialog"]',
            ) ?? undefined
          }
        >
          <div
            ref={refs.setFloating}
            className="auto-root auto-tip"
            style={{ ...floatingStyles, pointerEvents: "auto" }}
            {...interactions.getFloatingProps()}
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

/** Internal tip dispatcher. Priority: explicit component, global component, built-in default. Empty content renders only the trigger. */
export function AutoTip({
  content,
  children,
  tipComponent,
  placement,
}: Omit<AutoTipProps, "content"> &
  TipConfig & { content?: AutoTipProps["content"] }) {
  const services = useAutoConfig();
  useLibraryStyles();
  if (content == null || content === false || content === "") return children;
  const Tip = tipComponent ?? services.tipComponent ?? DefaultTip;
  return (
    <Tip content={content} placement={placement}>
      {children}
    </Tip>
  );
}
