import { useEffect, useRef, type ReactNode } from "react";
import { registerAutoFocus } from "./registry";

export interface AutoFocusProps {
  /** Content to search for the first visible, focusable control. Adds a display:contents wrapper. */
  children?: ReactNode;
  /** Optional selector within this component, or an explicit DOM ref (also usable without children). */
  target?: string | { readonly current: HTMLElement | null };
  /** Excludes this registration without unmounting its children. */
  disabled?: boolean;
}

/** The last registered visible target in this document receives focus when the winner changes. */
export function AutoFocus({
  children,
  target,
  disabled = false,
}: AutoFocusProps) {
  const root = useRef<HTMLDivElement>(null);
  const options = useRef({ target, disabled });
  const registration = useRef<ReturnType<typeof registerAutoFocus> | null>(
    null,
  );

  useEffect(() => {
    if (!root.current) return;
    const entry = registerAutoFocus(root.current, () => options.current);
    registration.current = entry;
    return () => {
      entry.unregister();
      registration.current = null;
    };
  }, []);

  const previousTarget = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = typeof target === "object" ? target.current : null;
    const changed =
      options.current.target !== target ||
      options.current.disabled !== disabled ||
      previousTarget.current !== element;
    options.current = { target, disabled };
    previousTarget.current = element;
    // A stable ref can point to a different existing element after commit.
    // Probe that cheaply on render; unchanged options never schedule a scan.
    if (changed) registration.current?.refresh();
  });

  return (
    <div ref={root} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
