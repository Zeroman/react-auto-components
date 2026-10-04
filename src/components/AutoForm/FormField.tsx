import { useAutoText } from "../../core/i18n";
import { useEffect, useRef, useState } from "react";
import type {
  AnyField,
  FieldContext,
  FieldClassNames,
  FieldStyles,
  Values,
} from "../../core/types";
import { resolve, errorMessage } from "../../core/config";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import { Cascader, VirtualSelect } from "./ChoiceField";
export function FormField<T extends object>({
  field,
  context,
  readOnly,
  resetEpoch = 0,
  onUploadPending,
  classNames,
  styles,
}: {
  field: AnyField<T>;
  context: FieldContext<T>;
  readOnly?: boolean;
  resetEpoch?: number;
  onUploadPending?: (id: string, pending: boolean) => void;
  classNames?: FieldClassNames;
  styles?: FieldStyles;
}) {
  const tr = useAutoText();
  const services = useAutoConfig();
  const { id, value, values, onChange, disabled } = context;
  const type = field.type ?? "input";
  const options = resolve(field.options, values, []);
  const [uploading, setUploading] = useState(false),
    [uploadError, setUploadError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    controller.current?.abort();
    setUploading(false);
    setUploadError("");
    if (uploadInput.current) uploadInput.current.value = "";
    return () => controller.current?.abort();
  }, [resetEpoch, value]);
  useEffect(() => {
    onUploadPending?.(id, uploading);
    return () => onUploadPending?.(id, false);
  }, [id, uploading, onUploadPending]);

  const inputClassName =
    Array.from(
      new Set(
        [context.className, classNames?.input, field.classNames?.input]
          .filter(Boolean)
          .flatMap((s) => s!.split(/\s+/)),
      ),
    ).join(" ") || undefined;

  const inputStyle = {
    ...context.style,
    ...styles?.input,
    ...field.styles?.input,
  };
  const hasInputStyle = Object.keys(inputStyle).length > 0;

  const enrichedContext: FieldContext<T> = {
    ...context,
    describedBy:
      [context.describedBy, context.error ? `${id}-error` : undefined]
        .filter(Boolean)
        .join(" ") || undefined,
    className: inputClassName,
    style: hasInputStyle ? inputStyle : undefined,
  };

  if (field.render) return field.render(enrichedContext);
  if (field.component && services.fields[field.component])
    return services.fields[field.component](
      enrichedContext as FieldContext<Values>,
    );
  if (readOnly || type === "text")
    return (
      <output
        id={id}
        aria-describedby={enrichedContext.describedBy}
        className={inputClassName}
        style={hasInputStyle ? inputStyle : undefined}
      >
        {options.find((o) => Object.is(o.value, value))?.label ??
          (value == null
            ? "—"
            : Array.isArray(value)
              ? value.join(", ")
              : String(value))}
      </output>
    );
  if (type === "title")
    return (
      <h3
        id={id}
        className={field.classNames?.label ?? classNames?.label}
        style={{ ...styles?.label, ...field.styles?.label }}
      >
        {field.label}
      </h3>
    );
  if (type === "tip")
    return (
      <span
        id={id}
        className={[
          "auto-muted",
          field.classNames?.control,
          classNames?.control,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ ...styles?.control, ...field.styles?.control }}
      >
        {field.content ?? field.label}
      </span>
    );
  if (type === "append")
    return (
      <div
        id={id}
        className={
          [field.classNames?.control, classNames?.control]
            .filter(Boolean)
            .join(" ") || undefined
        }
        style={{ ...styles?.control, ...field.styles?.control }}
      >
        {field.content}
      </div>
    );
  if (type === "divider")
    return (
      <hr
        id={id}
        className={["auto-divider", field.classNames?.root, classNames?.root]
          .filter(Boolean)
          .join(" ")}
        style={{ ...styles?.root, ...field.styles?.root }}
      />
    );
  if (type === "button")
    return (
      <button
        id={id}
        type="button"
        disabled={disabled}
        className={
          [classNames?.input, field.classNames?.input]
            .filter(Boolean)
            .join(" ") || undefined
        }
        style={hasInputStyle ? inputStyle : undefined}
        onClick={() => field.onAction?.(values)}
      >
        {field.label}
      </button>
    );
  const common = {
    id,
    disabled,
    className: inputClassName,
    style: hasInputStyle ? inputStyle : undefined,
    "aria-invalid": !!context.error,
    "aria-describedby": enrichedContext.describedBy,
  };
  if (type === "switch")
    return (
      <input
        {...common}
        type="checkbox"
        role="switch"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  if (type === "progress")
    return (
      <progress {...common} max={field.max ?? 100} value={Number(value ?? 0)} />
    );
  if (type === "textarea")
    return (
      <textarea
        {...common}
        rows={field.rows ?? 3}
        placeholder={field.placeholder}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  if (
    type === "select-v2" ||
    type === "virtual-select" ||
    (type === "select" && field.virtual)
  )
    return (
      <VirtualSelect
        {...common}
        value={value}
        options={options}
        onChange={onChange}
        multiple={field.multiple}
      />
    );
  if (type === "cascader")
    return (
      <Cascader
        {...common}
        value={value}
        options={options}
        onChange={onChange}
      />
    );
  if (type === "select")
    return (
      <select
        {...common}
        multiple={field.multiple}
        value={
          field.multiple
            ? options.flatMap((o, i) =>
                Array.isArray(value) && value.includes(o.value)
                  ? [String(i)]
                  : [],
              )
            : String(options.findIndex((o) => Object.is(o.value, value)))
        }
        onChange={(e) =>
          onChange(
            field.multiple
              ? Array.from(e.target.selectedOptions).map(
                  (o) => options[Number(o.value)].value,
                )
              : options[Number(e.target.value)]?.value,
          )
        }
      >
        {!field.multiple && <option value="-1">{tr("Select")}</option>}
        {options.map((o, i) => (
          <option value={i} key={i} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    );
  if (type === "radio" || type === "checkbox")
    return (
      <div
        id={id}
        role="group"
        aria-label={field.label}
        className="auto-actions"
      >
        {options.map((o, i) => (
          <label key={i}>
            <input
              type={type}
              aria-describedby={enrichedContext.describedBy}
              aria-invalid={!!context.error}
              disabled={disabled || o.disabled}
              name={id}
              checked={
                type === "radio"
                  ? Object.is(value, o.value)
                  : Array.isArray(value) && value.includes(o.value)
              }
              onChange={(e) =>
                onChange(
                  type === "radio"
                    ? o.value
                    : e.target.checked
                      ? [...(Array.isArray(value) ? value : []), o.value]
                      : (Array.isArray(value) ? value : []).filter(
                          (v) => v !== o.value,
                        ),
                )
              }
            />
            {o.label}
          </label>
        ))}
      </div>
    );
  if (type === "upload")
    return (
      <div>
        <input
          {...common}
          ref={uploadInput}
          type="file"
          multiple={field.multiple}
          accept={field.accept}
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            controller.current?.abort();
            const c = new AbortController();
            controller.current = c;
            setUploading(true);
            setUploadError("");
            try {
              const result = field.upload
                ? await field.upload(files, c.signal)
                : files;
              if (!c.signal.aborted) onChange(result);
            } catch (error) {
              if (!c.signal.aborted) setUploadError(errorMessage(error));
            } finally {
              if (!c.signal.aborted) setUploading(false);
            }
          }}
        />
        {uploading && <span role="status">{tr("Uploading…")}</span>}
        {uploadError && <span role="alert">{uploadError}</span>}
        {value != null && (
          <small>
            {Array.isArray(value)
              ? value
                  .map((v) => (v instanceof File ? v.name : String(v)))
                  .join(", ")
              : String(value)}
          </small>
        )}
      </div>
    );
  const date =
    type === "date" ||
    type === "datetime" ||
    type === "daterange" ||
    type === "datetimerange";
  if (date) {
    const withTime = type.includes("time");
    const range = type.endsWith("range");
    const format = (v: unknown) => {
      if (v == null || v === "") return "";
      if (field.dateValue !== "timestamp") return String(v);
      const d = new Date(Number(v));
      if (Number.isNaN(d.getTime())) return "";
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}${withTime ? `T${pad(d.getHours())}:${pad(d.getMinutes())}` : ""}`;
    };
    const parse = (s: string) =>
      s === ""
        ? null
        : field.dateValue === "timestamp"
          ? new Date(withTime ? s : `${s}T00:00:00`).getTime()
          : s;
    return (
      <div className="auto-actions">
        {(range ? [0, 1] : [0]).map((i) => (
          <input
            {...common}
            id={i ? `${id}-end` : id}
            key={i}
            aria-label={
              range
                ? `${field.label} ${i ? tr("end") : tr("start")}`
                : undefined
            }
            type={withTime ? "datetime-local" : "date"}
            value={format(
              range ? (Array.isArray(value) ? value[i] : null) : value,
            )}
            onChange={(e) => {
              if (!range) onChange(parse(e.target.value));
              else {
                const next = Array.isArray(value) ? [...value] : [null, null];
                next[i] = parse(e.target.value);
                onChange(next);
              }
            }}
          />
        ))}
        {field.shortcuts?.map((s) => (
          <button
            type="button"
            key={s.label}
            disabled={disabled}
            onClick={() => onChange(s.value())}
          >
            {s.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <>
      <input
        {...common}
        type={
          type === "integer" ? "number" : type === "email" ? "email" : "text"
        }
        inputMode={
          type === "float" || type === "percentage" ? "decimal" : undefined
        }
        min={field.min}
        max={field.max}
        step={field.step ?? (type === "integer" ? 1 : undefined)}
        placeholder={field.placeholder}
        value={String(value ?? "")}
        list={type === "autocomplete" ? `${id}-options` : undefined}
        onChange={(e) => {
          const s = e.target.value;
          onChange(
            type === "integer"
              ? s === ""
                ? undefined
                : Number(s)
              : type === "float" || type === "percentage"
                ? s
                    .replace(/[^\d.\-]/g, "")
                    .replace(/(?!^)-/g, "")
                    .replace(/(\..*)\./g, "$1")
                : s,
          );
        }}
      />
      {type === "autocomplete" && (
        <datalist id={`${id}-options`}>
          {options.map((o, i) => (
            <option key={i} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </datalist>
      )}
    </>
  );
}
