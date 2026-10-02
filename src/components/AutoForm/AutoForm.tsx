import { useAutoText } from "../../core/i18n";
import { useForm, useStore } from "@tanstack/react-form";
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { defaults, equal, resolve, errorMessage } from "../../core/config";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import { racTestId } from "../../core/testid";
import { useFieldWarnings, useLibraryStyles } from "../../core/dev";
import type { Values } from "../../core/types";
import type { AutoFormProps } from "./types";
import { FormField } from "./FormField";
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
export function AutoForm<T extends object>({
  fields,
  value,
  defaultValue,
  onChange,
  onSubmit,
  disabled = false,
  readOnly = false,
  columns = 2,
  labelPosition: ownLabelPosition,
  labelAlign: ownLabelAlign,
  labelWidth: ownLabelWidth,
  density: ownDensity,
  size: ownSize,
  actions = true,
  submitLabel,
  resetLabel,
  extraActions,
  onReset,
  children,
  className = "",
  style,
  ref,
}: AutoFormProps<T>) {
  const tr = useAutoText();
  const services = useAutoConfig();
  useLibraryStyles();
  useFieldWarnings("AutoForm", fields, value);
  const labelPosition =
    ownLabelPosition ?? services.form.labelPosition ?? "top";
  const labelAlign =
    ownLabelAlign ??
    services.form.labelAlign ??
    (labelPosition === "left" ? "right" : "left");
  const labelWidth = ownLabelWidth ?? services.form.labelWidth ?? "auto";
  const isAutoWidth = labelWidth === "auto";
  const [autoLabelWidth, setAutoLabelWidth] = useState<number | null>(null);
  const density =
    ownDensity ?? services.form.density ?? services.density ?? "comfortable";
  const size = ownSize ?? services.form.size ?? services.size ?? "medium";
  const id = useId();
  const initial = useRef(defaults<T>(fields, value ?? defaultValue));
  const form = useForm({
    defaultValues: initial.current as Values,
  });
  const values = useStore(form.store, (s) => s.values) as T;
  const [resetEpoch, setResetEpoch] = useState(0);
  const [pendingUploads, setPendingUploads] = useState<Set<string>>(
    () => new Set(),
  );
  const trackUpload = useCallback((id: string, pending: boolean) => {
    setPendingUploads((current) => {
      if (current.has(id) === pending) return current;
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [submitting, setSubmitting] = useState(false),
    [submitError, setSubmitError] = useState("");
  const revision = useRef(0),
    validation = useRef(0),
    busy = useRef(false);
  const node = useRef<HTMLFormElement>(null);
  const mounted = useRef(true);
  useIsomorphicLayoutEffect(() => {
    if (!isAutoWidth || labelPosition !== "left" || !node.current) {
      return;
    }
    const formEl = node.current;
    // Search fields size their own labels with CSS rather than sharing a width.
    if (formEl.parentElement?.matches('.auto-search[data-label-width="auto"]'))
      return;
    const measure = () => {
      const labels = formEl.querySelectorAll<HTMLLabelElement>(
        ":scope > .auto-form-grid > .auto-field[data-field] > label",
      );
      if (!labels.length) return;
      let max = 0;
      let available = Infinity;
      labels.forEach((label) => {
        if (!label.getClientRects().length) return;
        const range = formEl.ownerDocument.createRange();
        if (typeof range.getBoundingClientRect !== "function") return;
        // Measure natural width even when the displayed label wraps.
        const previousWhiteSpace = label.style.whiteSpace;
        try {
          label.style.whiteSpace = "nowrap";
          range.selectNodeContents(label);
          max = Math.max(max, Math.ceil(range.getBoundingClientRect().width));
        } finally {
          label.style.whiteSpace = previousWhiteSpace;
        }
        available = Math.min(
          available,
          label.parentElement!.getBoundingClientRect().width * 0.45,
        );
      });
      if (max > 0 && available > 0) {
        const width = Math.min(max, Math.floor(available));
        setAutoLabelWidth((prev) => (prev === width ? prev : width));
      }
    };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => measure());
      observer.observe(formEl);
      return () => observer.disconnect();
    }
  }, [
    isAutoWidth,
    labelPosition,
    fields,
    values,
    size,
    density,
    columns,
    services.t,
    services.canAccess,
  ]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      validation.current++;
    };
  }, []);
  useEffect(() => {
    if (value !== undefined && !equal(value, form.state.values)) {
      revision.current++;
      setResetEpoch((epoch) => epoch + 1);
      form.reset(value as Values, {
        keepDefaultValues: true,
      });
      setErrors({});
    }
  }, [value, values, form]);
  function update(name: string, next: unknown) {
    if (disabled || readOnly) return;
    revision.current++;
    const field = fields.find((f) => f.name === name);
    let result = {
      ...form.state.values,
      [name]: next,
    } as T;
    const patch = field?.onChange?.(next, result);
    if (patch)
      result = {
        ...result,
        ...patch,
      };
    for (const [key, v] of Object.entries(result)) form.setFieldValue(key, v);
    setErrors((e) => {
      const copy = {
        ...e,
      };
      delete copy[name];
      return copy;
    });
    onChange?.(result);
  }
  async function validate() {
    if (pendingUploads.size) {
      setSubmitError(tr("Wait for the upload to finish"));
      return false;
    }
    const ticket = ++validation.current;
    const rev = revision.current;
    const snapshot = {
      ...form.state.values,
    } as T;
    const next: Record<string, string> = {};
    await Promise.all(
      fields.map(async (f) => {
        if (
          !f.name ||
          resolve(f.hidden, snapshot, false) ||
          !services.canAccess(f) ||
          resolve(f.disabled, snapshot, false)
        )
          return;
        const v = snapshot[f.name];
        if (
          f.required &&
          (v === undefined ||
            v === null ||
            v === "" ||
            (Array.isArray(v) && !v.length))
        )
          next[f.name] = tr("{0} is required", [f.label ?? f.name]);
        else
          for (const rule of f.rules ?? []) {
            try {
              const message = await rule(v, snapshot);
              if (message) {
                next[f.name] = message;
                break;
              }
            } catch (e) {
              next[f.name] = errorMessage(e);
              break;
            }
          }
      }),
    );
    if (
      !mounted.current ||
      ticket !== validation.current ||
      rev !== revision.current
    )
      return false;
    setErrors(next);
    return Object.keys(next).length === 0;
  }
  function reset(next?: T) {
    revision.current++;
    setResetEpoch((epoch) => epoch + 1);
    validation.current++;
    const target = next ?? defaults<T>(fields, defaultValue);
    form.reset(target as Values, {
      keepDefaultValues: true,
    });
    setErrors({});
    setSubmitError("");
    onChange?.(target);
    onReset?.();
  }
  useImperativeHandle(ref, () => ({
    validate,
    reset,
    getValues: () =>
      ({
        ...form.state.values,
      }) as T,
    setValue: update,
    focus(name) {
      node.current
        ?.querySelector<HTMLElement>(
          `[data-field="${CSS.escape(name)}"] input, [data-field="${CSS.escape(name)}"] select`,
        )
        ?.focus();
    },
  }));
  async function submit() {
    if (busy.current || disabled || readOnly) return;
    busy.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      if (await validate())
        await onSubmit?.({
          ...form.state.values,
        } as T);
    } catch (e) {
      if (mounted.current) setSubmitError(errorMessage(e));
    } finally {
      busy.current = false;
      if (mounted.current) setSubmitting(false);
    }
  }
  return (
    <form
      ref={node}
      className={`auto-root auto-form ${className}`}
      data-label-position={labelPosition}
      data-label-align={labelAlign}
      data-label-width={
        isAutoWidth
          ? "auto"
          : typeof labelWidth === "number"
            ? `${labelWidth}px`
            : labelWidth
      }
      data-density={density}
      data-size={size}
      style={
        {
          "--auto-label-width": isAutoWidth
            ? autoLabelWidth
              ? `${autoLabelWidth}px`
              : "96px"
            : typeof labelWidth === "number"
              ? `${labelWidth}px`
              : labelWidth,
          ...style,
        } as React.CSSProperties
      }
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div
        className="auto-form-grid"
        style={
          {
            "--auto-columns": columns,
          } as React.CSSProperties
        }
      >
        {fields.map((f, i) => {
          if (resolve(f.hidden, values, false) || !services.canAccess(f))
            return null;
          const name = f.name;
          const fieldId = `${id}-${name ?? i}`;
          const label = f.lang
            ? services.t(f.lang, f.label)
            : (f.label ?? name);
          const structural = !name;
          return (
            <div
              key={name ?? i}
              data-field={name}
              data-testid={name ? racTestId("field", name) : undefined}
              className={`auto-field ${f.className ?? ""}`}
              style={{
                gridColumn: f.lineBreak
                  ? "1 / -1"
                  : `span ${Math.min(f.span ?? 1, columns)}`,
                ...f.style,
              }}
            >
              {!structural && (
                <label htmlFor={fieldId}>
                  {label}
                  {f.required && <span aria-hidden="true"> *</span>}
                </label>
              )}
              <div className="auto-field-control">
                <FormField
                  resetEpoch={resetEpoch}
                  onUploadPending={trackUpload}
                  field={f}
                  context={{
                    id: fieldId,
                    value: name ? values[name] : undefined,
                    values,
                    onChange: (v) => name && update(name, v),
                    disabled:
                      disabled ||
                      submitting ||
                      resolve(f.disabled, values, false),
                    error: name ? errors[name] : undefined,
                  }}
                  readOnly={readOnly}
                />
                {name && errors[name] && (
                  <span
                    className="auto-error"
                    id={`${fieldId}-error`}
                    role="alert"
                  >
                    {errors[name]}
                  </span>
                )}
                {f.tip && !structural && (
                  <small className="auto-muted">{f.tip}</small>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {children}
      {submitError && (
        <p role="alert" className="auto-error">
          {submitError}
        </p>
      )}
      {actions && !readOnly && (
        <div className="auto-actions auto-form-actions">
          <button
            className="auto-primary"
            type="submit"
            data-testid="rac-submit"
            disabled={disabled || submitting || pendingUploads.size > 0}
          >
            {submitting ? tr("Submitting…") : (submitLabel ?? tr("Submit"))}
          </button>
          <button
            type="button"
            data-testid="rac-reset"
            disabled={disabled || submitting}
            onClick={() => reset()}
          >
            {resetLabel ?? tr("Reset")}
          </button>
          {extraActions}
        </div>
      )}
    </form>
  );
}
