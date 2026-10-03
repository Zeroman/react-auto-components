import { AutoTip, type TipConfig } from "../components/AutoTip";
import {
  autoUpdate,
  flip,
  shift,
  offset,
  size,
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  useMergeRefs,
  FloatingPortal,
  FloatingFocusManager,
  type Placement,
} from "@floating-ui/react";
import {
  cloneElement,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { useAutoConfig } from "../core/AutoConfigProvider";
import "./popover.css";

interface PopoverProps extends TipConfig {
  tip?: ReactNode;
  children: ReactElement<
    HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement>; disabled?: boolean }
  >;
  content: ReactNode;
  placement?: Placement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
/** Internal positioning primitive for menu flyouts and table filters. */
export function Popover({
  children,
  tip,
  tipComponent,
  content,
  placement = "bottom",
  open: controlled,
  onOpenChange,
}: PopoverProps) {
  const services = useAutoConfig();
  const [local, setLocal] = useState(false);
  const disabled = !!children.props.disabled;
  const open = !disabled && (controlled ?? local);
  const setOpen = (next: boolean) => {
    if (disabled && next) return;
    if (controlled === undefined) setLocal(next);
    onOpenChange?.(next);
  };
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableWidth, availableHeight, elements }) {
          elements.floating.style.setProperty(
            "--auto-popover-available-width",
            `${Math.max(0, availableWidth)}px`,
          );
          elements.floating.style.setProperty(
            "--auto-popover-available-height",
            `${Math.max(0, availableHeight)}px`,
          );
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const interactions = useInteractions([
    useClick(context, { enabled: !disabled }),
    useDismiss(context),
    useRole(context),
  ]);
  const triggerRef = useMergeRefs([refs.setReference, children.props.ref]);
  return (
    <>
      <AutoTip content={tip} tipComponent={tipComponent}>
        {cloneElement(children, {
          ...interactions.getReferenceProps(children.props),
          ref: triggerRef,
        })}
      </AutoTip>
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} returnFocus>
            <div
              ref={refs.setFloating}
              className="auto-root auto-popover"
              data-size={services.size}
              data-density={services.density}
              style={floatingStyles}
              {...interactions.getFloatingProps({
                "aria-label":
                  children.props["aria-label"] ??
                  services.t("popover.label", "Popover"),
              })}
            >
              <div className="auto-popover-body">{content}</div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
