import type { TipConfig } from "../AutoTip";
import { useAutoText } from "../../core/i18n";
import * as Dialog from "@radix-ui/react-dialog";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AutoForm, type AutoFormHandle } from "../AutoForm";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import { defaults, errorMessage } from "../../core/config";
import { RacError } from "../../core/errors";
import { useLibraryStyles } from "../../core/dev";
import type { ComponentSize, Field } from "../../core/types";
/** Why a dialog closed. `"submit"` only happens after `onSubmit` resolves and `beforeClose` allows it. */
export type CloseReason = "cancel" | "close" | "submit";
/**
 * Dialog content. Provide `fields` for a schema form, or `content` for custom nodes.
 * `onSubmit` rejection keeps the dialog open and shows `error.message`. Values stay.
 * `beforeClose` returning `false` cancels the close. Throwing also cancels it and shows the message.
 * `draftKey` persists the draft at `${namespace}:draft:${draftKey}` until a successful submit clears it.
 */
export interface DialogOptions<T extends object> extends TipConfig {
  title: string;
  description?: string;
  content?: ReactNode;
  fields?: readonly Field<T>[];
  defaultValue?: Partial<T>;
  draftKey?: string;
  /**
   * Resolve to close (after `beforeClose`). Reject or throw to stay open and show the message.
   * A failed `validate()` does not call this.
   */
  onSubmit?: (values: T) => void | Promise<void>;
  /**
   * Return `false` to keep the dialog open. Throw to keep it open and show `error.message`.
   * Runs for submit, cancel, and dismiss.
   */
  beforeClose?: (reason: CloseReason) => boolean | Promise<boolean>;
  onClose?: (reason: CloseReason) => void;
  size?: ComponentSize;
  footer?: (actions: {
    submit: () => void;
    cancel: () => void;
    busy: boolean;
  }) => ReactNode;
  header?: ReactNode;
  width?: number;
  fullscreen?: boolean;
  draggable?: boolean;
  showReset?: boolean;
  hideFooter?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  extraActions?: ReactNode;
}
export interface DialogHandle {
  id: string;
  close: () => Promise<boolean>;
}
interface Entry {
  id: string;
  render: (
    remove: (reason: CloseReason) => void,
    register: (close: () => Promise<boolean>) => void,
  ) => ReactNode;
}
interface DialogService {
  open<T extends object>(options: DialogOptions<T>): DialogHandle;
  close(id: string): Promise<boolean>;
}
const Context = createContext<DialogService | null>(null);
function createStore() {
  let entries: Entry[] = [];
  const listeners = new Set<() => void>();
  const closers = new Map<string, () => Promise<boolean>>();
  return {
    get: () => entries,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    add(entry: Entry) {
      entries = [...entries, entry];
      listeners.forEach((f) => f());
    },
    remove(id: string) {
      entries = entries.filter((e) => e.id !== id);
      closers.delete(id);
      listeners.forEach((f) => f());
    },
    closers,
  };
}
export function AutoDialogProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createStore);
  const entries = useSyncExternalStore(store.subscribe, store.get, store.get);
  const [service]: [DialogService, unknown] = useState<DialogService>(() => ({
    open<T extends object>(options: DialogOptions<T>) {
      const id = crypto.randomUUID();
      store.add({
        id,
        render: (remove, register) => (
          <ManagedDialog
            key={id}
            options={options}
            remove={remove}
            register={register}
          />
        ),
      });
      return {
        id,
        close: async (): Promise<boolean> => {
          const fn = store.closers.get(id);
          if (fn) return fn();
          store.remove(id);
          return true;
        },
      };
    },
    async close(id) {
      const closer = store.closers.get(id);
      if (closer) return closer();
      store.remove(id);
      return true;
    },
  }));
  return (
    <Context value={service}>
      {children}
      {entries.map((e) =>
        e.render(
          () => store.remove(e.id),
          (close) => store.closers.set(e.id, close),
        ),
      )}
    </Context>
  );
}
export function useAutoDialog() {
  const ctx = useContext(Context);
  if (!ctx)
    throw new RacError(
      "AutoDialog",
      "RAC-DIALOG-PROVIDER",
      "useAutoDialog() was called outside AutoDialogProvider.",
      "Render <AutoDialogProvider> above this component. AutoConfigProvider does not provide dialogs and is optional.",
    );
  return ctx;
}
export function AutoDialog<T extends object>({
  open,
  onOpenChange,
  ...options
}: DialogOptions<T> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return open ? (
    <ManagedDialog options={options} remove={() => onOpenChange(false)} />
  ) : null;
}
function ManagedDialog<T extends object>({
  options,
  remove,
  register,
}: {
  options: DialogOptions<T>;
  remove: (reason: CloseReason) => void;
  register?: (close: () => Promise<boolean>) => void;
}) {
  const tr = useAutoText();
  const services = useAutoConfig();
  useLibraryStyles();
  const size = options.size ?? services.size ?? "medium";
  const key = options.draftKey
    ? `${services.namespace}:draft:${options.draftKey}`
    : undefined;
  const [values, setValues] = useState(() =>
    defaults<T>(
      options.fields ?? [],
      (key
        ? (services.storage.get(key) as Partial<T> | undefined)
        : undefined) ?? options.defaultValue,
    ),
  );
  const current = useRef(values);
  current.current = values;
  const form = useRef<AutoFormHandle<T>>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [full, setFull] = useState(options.fullscreen ?? false),
    [position, setPosition] = useState({
      x: 0,
      y: 0,
    });
  const lock = useRef(false);
  const opener = useRef(
    typeof document === "undefined"
      ? null
      : (document.activeElement as HTMLElement | null),
  );
  async function close(reason: CloseReason) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    try {
      if (options.beforeClose && !(await options.beforeClose(reason)))
        return false;
      if (key) {
        if (reason === "submit") services.storage.remove(key);
        else services.storage.set(key, current.current);
      }
      remove(reason);
      options.onClose?.(reason);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    register?.(() => closeRef.current("close"));
  }, [register]);
  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (form.current && !(await form.current.validate())) return;
      await options.onSubmit?.(form.current?.getValues() ?? current.current);
      lock.current = false;
      await close("submit");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) void close("close");
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="auto-overlay-backdrop" />
        <Dialog.Content
          className={`auto-root auto-overlay ${full ? "auto-dialog-full" : ""}`}
          data-testid="rac-dialog"
          data-size={size}
          style={{
            width: full ? undefined : (options.width ?? 560),
            transform: full
              ? undefined
              : `translate(calc(-50% + ${position.x}px),calc(-50% + ${position.y}px))`,
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            opener.current?.focus();
          }}
        >
          <header
            className="auto-dialog-header"
            onPointerDown={(e) => {
              if (
                !options.draggable ||
                full ||
                (e.target as HTMLElement).closest("button")
              )
                return;
              const el = e.currentTarget;
              el.setPointerCapture(e.pointerId);
              const start = {
                x: e.clientX,
                y: e.clientY,
              };
              const move = (ev: PointerEvent) =>
                setPosition({
                  x: Math.max(
                    -innerWidth / 3,
                    Math.min(innerWidth / 3, position.x + ev.clientX - start.x),
                  ),
                  y: Math.max(
                    -innerHeight / 3,
                    Math.min(
                      innerHeight / 3,
                      position.y + ev.clientY - start.y,
                    ),
                  ),
                });
              const end = () => {
                el.removeEventListener("pointermove", move);
                el.removeEventListener("pointerup", end);
                el.removeEventListener("pointercancel", end);
              };
              el.addEventListener("pointermove", move);
              el.addEventListener("pointerup", end);
              el.addEventListener("pointercancel", end);
            }}
          >
            <Dialog.Title>{options.header ?? options.title}</Dialog.Title>
            <div className="auto-actions">
              <button
                type="button"
                aria-label={tr("Toggle fullscreen")}
                onClick={() => setFull(!full)}
              >
                ⛶
              </button>
              <button
                type="button"
                data-testid="rac-dialog-close"
                aria-label={tr("Close dialog")}
                disabled={busy}
                onClick={() => void close("close")}
              >
                ×
              </button>
            </div>
          </header>
          {options.description && (
            <Dialog.Description>{options.description}</Dialog.Description>
          )}
          <div className="auto-dialog-body">
            {options.fields ? (
              <AutoForm
                tipComponent={options.tipComponent}
                ref={form}
                fields={options.fields}
                value={values}
                defaultValue={options.defaultValue}
                onChange={setValues}
                onSubmit={() => submit()}
                actions={false}
                disabled={busy}
                size={size}
              />
            ) : (
              options.content
            )}
            {error && (
              <p role="alert" className="auto-error">
                {error}
              </p>
            )}
          </div>
          {!options.hideFooter && (
            <footer className="auto-actions auto-dialog-footer">
              {options.footer ? (
                options.footer({
                  submit: () => void submit(),
                  cancel: () => void close("cancel"),
                  busy,
                })
              ) : (
                <>
                  {options.showReset && (
                    <button
                      type="button"
                      data-testid="rac-dialog-reset"
                      disabled={busy}
                      onClick={() => form.current?.reset()}
                    >
                      {tr("Reset")}
                    </button>
                  )}
                  {options.extraActions}
                  <button
                    type="button"
                    data-testid="rac-cancel"
                    disabled={busy}
                    onClick={() => void close("cancel")}
                  >
                    {options.cancelLabel ?? tr("Cancel")}
                  </button>
                  <button
                    type="button"
                    className="auto-primary"
                    data-testid="rac-ok"
                    disabled={busy}
                    onClick={() => void submit()}
                  >
                    {busy ? tr("Working…") : (options.confirmLabel ?? tr("OK"))}
                  </button>
                </>
              )}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
