import {
  autoUpdate,
  flip,
  shift,
  offset,
  useFloating,
  useClick,
  useHover,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
  safePolygon,
  type Placement,
} from "@floating-ui/react";
import {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
  type HTMLAttributes,
} from "react";
export interface AutoPopoverProps {
  children?: ReactElement<HTMLAttributes<HTMLElement>>;
  anchor?: HTMLElement;
  content: ReactNode;
  placement?: Placement;
  trigger?: "click" | "hover";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export function AutoPopover({
  children,
  anchor,
  content,
  placement = "bottom",
  trigger = "click",
  open: controlled,
  onOpenChange,
}: AutoPopoverProps) {
  const [local, setLocal] = useState(false);
  const open = controlled ?? local;
  const setOpen = (v: boolean) => {
    setLocal(v);
    onOpenChange?.(v);
  };
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    elements: anchor ? { reference: anchor } : undefined,
  });
  const interactions = useInteractions([
    useClick(context, { enabled: trigger === "click" }),
    useHover(context, {
      enabled: trigger === "hover",
      handleClose: safePolygon(),
    }),
    useDismiss(context),
    useRole(context),
  ]);
  useEffect(() => {
    if (!anchor || !open) return;
    const observer = new MutationObserver(() => {
      if (!anchor.isConnected) setOpen(false);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [anchor, open]);
  return (
    <>
      {children &&
        cloneElement(children, {
          ...interactions.getReferenceProps(children.props),
          ref: refs.setReference,
        } as HTMLAttributes<HTMLElement>)}
      {open && (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            modal={false}
            initialFocus={trigger === "hover" ? -1 : 0}
            returnFocus
          >
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="auto-popover"
              {...interactions.getFloatingProps()}
            >
              {content}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
interface PopoverService {
  show(options: {
    anchor: HTMLElement;
    content: ReactNode;
    placement?: Placement;
  }): string;
  hide(id?: string): void;
}
const Context = createContext<PopoverService | null>(null);
export function AutoPopoverProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<
    (Parameters<PopoverService["show"]>[0] & { id: string })[]
  >([]);
  const hide = (id?: string) =>
    setEntries((es) => (id ? es.filter((e) => e.id !== id) : []));
  return (
    <Context
      value={{
        show(options) {
          const id = crypto.randomUUID();
          setEntries((es) => [...es, { ...options, id }]);
          return id;
        },
        hide,
      }}
    >
      {children}
      {entries.map((e) => (
        <AutoPopover
          key={e.id}
          {...e}
          open
          onOpenChange={(open) => {
            if (!open) hide(e.id);
          }}
        />
      ))}
    </Context>
  );
}
export function useAutoPopover() {
  const context = useContext(Context);
  if (!context) throw new Error("AutoPopoverProvider is required");
  return context;
}
