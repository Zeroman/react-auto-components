import type { TipConfig } from "./tip";
import type { CSSProperties, ReactNode } from "react";

/** Loose record used by custom field renderers registered on the provider. */
export type Values = Record<string, unknown>;

/**
 * Control height token.
 * Default `"medium"` comes from `AutoConfigProvider` (`config.size`).
 */
export type ComponentSize = "small" | "medium" | "large";

/**
 * Vertical spacing token for forms, menus, tabs, and chat.
 * Default `"comfortable"`. Tables use {@link TableDensity} instead.
 */
export type ComponentDensity = "comfortable" | "compact";

/**
 * Table row spacing. `"normal"` is the table default when no provider density is set.
 * A provider `density: "compact"` maps to table `"compact"`; `"comfortable"` maps to `"normal"`.
 */
export type TableDensity = "compact" | "normal" | "comfortable";

/**
 * Label layout shared by `AutoForm` and `AutoSearch`.
 * Defaults: `labelPosition` `"top"`, `labelWidth` `"auto"` (measured, capped at 45% of the field).
 */
/**
 * CSS class name slots for field components.
 */
export interface FieldClassNames {
  /** Applied to the outer `.auto-field` container */
  root?: string;
  /** Applied to the `<label>` element */
  label?: string;
  /** Applied to the `.auto-field-control` wrapper */
  control?: string;
  /** Applied to the input / select / textarea control element */
  input?: string;
  /** Applied to the error message element (`.auto-error`) */
  error?: string;
  /** Applied to the tip trigger or marker */
  tip?: string;
}

/**
 * CSS style slots for field components.
 */
export interface FieldStyles {
  root?: CSSProperties;
  label?: CSSProperties;
  control?: CSSProperties;
  input?: CSSProperties;
  error?: CSSProperties;
  tip?: CSSProperties;
}

/**
 * CSS class name slots for form components.
 */
export interface AutoFormClassNames extends FieldClassNames {
  /** Applied to the root `<form>` element */
  form?: string;
  /** Applied to the `.auto-form-grid` layout grid */
  grid?: string;
  /** Applied to the `.auto-actions` container */
  actions?: string;
  /** Applied to the submit button */
  submit?: string;
  /** Applied to the reset button */
  reset?: string;
}

/**
 * CSS style slots for form components.
 */
export interface AutoFormStyles extends FieldStyles {
  form?: CSSProperties;
  grid?: CSSProperties;
  actions?: CSSProperties;
  submit?: CSSProperties;
  reset?: CSSProperties;
}

/**
 * Label layout shared by `AutoForm` and `AutoSearch`.
 * Defaults: `labelPosition` `"top"`, `labelWidth` `"auto"` (measured, capped at 45% of the field).
 */
export interface AutoFormLayout {
  /** `"top"` stacks the label. `"left"` puts it beside the control. Default `"top"`. */
  labelPosition?: "top" | "left";
  /** Used when `labelPosition` is `"left"`. Default `"right"` for left labels, otherwise `"left"`. */
  labelAlign?: "left" | "right";
  /**
   * Left-label column width. `"auto"` measures the longest label.
   * A number is pixels. A string is any CSS width (`"8rem"`).
   */
  labelWidth?: CSSProperties["width"];
  density?: ComponentDensity;
  size?: ComponentSize;
  classNames?: AutoFormClassNames;
  styles?: AutoFormStyles;
}

/** String keys of the value object. Symbols and numbers are not field names. */
export type FieldName<T> = Extract<keyof T, string>;

/**
 * A static value, or a function of the current form values.
 * Functions run during render. Keep them pure.
 */
export type Dynamic<V, T> = V | ((values: Readonly<T>) => V);

/**
 * Hide or disable a field, column, tab, or menu item.
 * Both lists are AND-ed: every listed role and permission must pass `canAccess`.
 * Default `canAccess` returns true for everything.
 */
export interface Access {
  /** Visible when the user has every role. Omit to skip the role check. */
  roles?: readonly string[];
  /** Visible when the user has every permission. Omit to skip the permission check. */
  permissions?: readonly string[];
}

/**
 * One choice. `value` keeps boolean and numeric identity (`false` and `0` are selectable).
 * `children` is only read by `type: "cascader"`.
 */
export interface Option {
  value: string | number | boolean;
  label: string;
  disabled?: boolean;
  /** Next cascader column. Ignored by select, radio, and checkbox. */
  children?: readonly Option[];
}

/**
 * Input / data-bearing field types.
 */
export type ValueFieldType =
  | "input"
  | "email"
  | "textarea"
  | "integer"
  | "float"
  | "percentage"
  | "progress"
  | "switch"
  | "select"
  | "select-v2"
  | "virtual-select"
  | "radio"
  | "checkbox"
  | "cascader"
  | "autocomplete"
  | "date"
  | "datetime"
  | "daterange"
  | "datetimerange"
  | "upload"
  | "text"
  | "custom";

/**
 * Display, decorator, and layout element types.
 */
export type DisplayItemType = "title" | "tip" | "button" | "append" | "divider";

/**
 * Widget id. Omit it and the field renders as a text input.
 * Illegal combinations (`select` without `options`, a scalar on `daterange`) are rejected by {@link Field}.
 */
export type FieldType = ValueFieldType | DisplayItemType;

/** Widgets that render an empty control when `options` is missing. `options` is required. */
export type ChoiceFieldType =
  "select" | "select-v2" | "virtual-select" | "radio" | "checkbox" | "cascader";

/** Value is a two-item `[start, end]`. A scalar string or number is rejected. */
export type DateRangeFieldType = "daterange" | "datetimerange";

/**
 * How a search field compares. Default is `"eq"`, or `"in"` when the value is an array.
 * `"between"` is legal only when the model field is a two-item tuple.
 * `"isNull"` ignores the value and matches null or undefined.
 */
export type MatchOperator = "eq" | "in" | "contains" | "between" | "isNull";

/**
 * Search-specific configuration when used in AutoSearch or table search panels.
 */
export interface SearchConfig {
  /**
   * Search comparison. See {@link MatchOperator}.
   * `"between"` requires `T[name]` to be a two-item tuple.
   */
  match?: MatchOperator;
  /** Case-fold string comparisons. Only affects `"contains"` and `"eq"` style matches. */
  ignoreCase?: boolean;
  /** Also match rows where the field is null or undefined (`OR` with `isNull`). */
  includeNull?: boolean;
  /**
   * Query these row keys instead of `name`, OR-ed together.
   * Example: one "keyword" input searching `first` and `last`.
   */
  searchFields?: readonly string[];
  /** Search panels hide this field behind "More" until the user expands them. */
  more?: boolean;
}

/**
 * Recommended `[from, to]` / `[start, end]` value.
 * A wider array type also passes {@link Field}; a scalar does not.
 * Open ends may be `null`.
 */
export type Pair<T = string | number | null> = readonly [T, T];

/** Props passed to `render` and to renderers registered on `AutoConfigProvider.config.fields`. */
export interface FieldContext<T extends object> {
  /** DOM id for the control and its `<label htmlFor>`. */
  id: string;
  value: unknown;
  values: Readonly<T>;
  onChange: (value: unknown) => void;
  disabled: boolean;
  /** Present when this field failed validation. Also referenced by `aria-describedby`. */
  error?: string;
  /** Space-separated IDs for field help and validation errors; apply to each control's `aria-describedby`. */
  describedBy?: string;
  /** Slot class name for the input element */
  className?: string;
  /** Slot style for the input element */
  style?: CSSProperties;
}

type RangeOk<V> = 0 extends 1 & V
  ? true
  : [unknown] extends [V]
    ? true
    : NonNullable<V> extends readonly unknown[]
      ? true
      : false;

/**
 * Props every named field accepts.
 * Type-specific props live on the variant (`options` on choice fields, `rows` on textarea).
 * Putting them on the wrong variant is a TypeScript excess-property error.
 */
export interface FieldShared<
  T extends object,
  K extends FieldName<T> = FieldName<T>,
>
  extends Access, TipConfig {
  /** Key of `T`. Title, tip, append, and button omit it. */
  name: K;
  /**
   * Shown next to the control. Falls back to `name`.
   * When `lang` is set, `config.t(lang, label)` is used instead.
   */
  label?: string;
  /** Message key passed to `config.t`. `label` is the fallback. */
  lang?: string;
  /**
   * Initial value when the form is uncontrolled. Must be `T[name]`.
   * Ignored once `value` is passed. Cloned with `structuredClone`.
   */
  defaultValue?: T[K];
  /** Hidden fields are not validated and are omitted from the search query. */
  hidden?: Dynamic<boolean, T>;
  /** Disabled fields stay visible but are not validated. */
  disabled?: Dynamic<boolean, T>;
  /**
   * Blocks submit when the value is `undefined`, `null`, `""`, or an empty array.
   * Hidden, disabled, and inaccessible fields are not checked.
   */
  required?: boolean;
  placeholder?: string;
  /** Grid columns this field spans. Default `1`. Clamped to the form's `columns`. */
  span?: number;
  /** Start on a new row and span the full grid. */
  lineBreak?: boolean;
  style?: CSSProperties;
  className?: string;
  classNames?: FieldClassNames;
  styles?: FieldStyles;
  /** Floating help next to the label. Display fields `type: "tip"` and `type: "append"` keep inline content. */
  tip?: ReactNode;
  /**
   * Run after the required check, in order. Return an error string, or throw (the message is shown).
   * A resolve of `undefined` passes. Later rules are skipped after the first failure.
   */
  rules?: readonly ((
    value: unknown,
    values: Readonly<T>,
  ) => string | undefined | Promise<string | undefined>)[];
  /**
   * Replace the built-in control. Called instead of `type`.
   * Throwing here escapes the input handler; the previous form value stays.
   */
  render?: (context: FieldContext<T>) => ReactNode;
  /**
   * Key in `AutoConfigProvider` `config.fields`. Used when `render` is absent.
   * The registered function receives this field's context.
   */
  component?: string;
  /**
   * After this field changes, return a partial value to patch other fields.
   * Throw to reject the keystroke; the previous value stays.
   */
  onChange?: (value: unknown, values: T) => Partial<T> | void;
  /**
   * Search-specific configuration when used in AutoSearch or table search panels.
   */
  search?: SearchConfig;
}

/** Text input. This is the default when `type` is omitted. `autocomplete` shows `options` as suggestions, not a closed list. */
export interface InputField<
  T extends object,
  K extends FieldName<T> = FieldName<T>,
> extends FieldShared<T, K> {
  /**
   * `"input"` is a text box. `"email"` uses the email keyboard. `"text"` is read-only.
   * `"autocomplete"` is a text box plus an optional suggestion list.
   */
  type?: "input" | "email" | "text" | "autocomplete";
  /** Suggestions for `"autocomplete"`. Not required. Other text types ignore this. */
  options?: Dynamic<readonly Option[], T>;
}

/** Multi-line text. `rows` defaults to `3`. */
export interface TextareaField<
  T extends object,
  K extends FieldName<T> = FieldName<T>,
> extends FieldShared<T, K> {
  type: "textarea";
  /** Visible lines. Default `3`. */
  rows?: number;
}

/**
 * Numeric control.
 * `"integer"` uses step `1` and stores a number (`undefined` while empty).
 * `"float"` and `"percentage"` store the raw decimal string so `"1."` can be typed.
 * `"progress"` is a read-only meter; `max` defaults to `100`.
 */
export interface NumberField<
  T extends object,
  K extends FieldName<T> = FieldName<T>,
> extends FieldShared<T, K> {
  type: "integer" | "float" | "percentage" | "progress";
  min?: number;
  max?: number;
  /** Default `1` for `"integer"`. Floats have no default step. */
  step?: number;
}

/** Boolean checkbox with `role="switch"`. The stored value is `true` or `false`. */
export interface SwitchField<
  T extends object,
  K extends FieldName<T> = FieldName<T>,
> extends FieldShared<T, K> {
  type: "switch";
}

/**
 * Closed set of options. `options` is required at compile time.
 * `"checkbox"` stores an array and keeps `false` as a real value.
 * `"cascader"` stores the path array and reads `Option.children`.
 * `"select-v2"` / `"virtual-select"` virtualizes long lists. `"multiple"` applies to selects.
 */
export interface ChoiceField<
  T extends object,
  K extends FieldName<T> = FieldName<T>,
> extends FieldShared<T, K> {
  type: ChoiceFieldType;
  /** Static list, or a function of the other values. An empty list renders no choices. */
  options: Dynamic<readonly Option[], T>;
  /** `"select"` / `"select-v2"` / `"virtual-select"` only. Stores an array of option values. */
  multiple?: boolean;
  /** Virtualize long lists of options. */
  virtual?: boolean;
}

/**
 * One calendar value.
 * `dateValue: "string"` (default) stores `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`.
 * `dateValue: "timestamp"` stores epoch milliseconds in local time.
 */
export interface DateField<
  T extends object,
  K extends FieldName<T> = FieldName<T>,
> extends FieldShared<T, K> {
  type: "date" | "datetime";
  /** Default `"string"`. */
  dateValue?: "string" | "timestamp";
  /** Buttons that call `onChange` with `value()`. Return the same shape as the field value. */
  shortcuts?: readonly { label: string; value: () => unknown }[];
}

/**
 * Two calendar values, `[start, end]`.
 * The model field must be a two-item tuple (`Pair` or `[string, string]`). A scalar is a type error.
 * Same `dateValue` rules as {@link DateField}.
 */
export interface DateRangeField<
  T extends object,
  K extends FieldName<T> = FieldName<T>,
> extends FieldShared<T, K> {
  type: DateRangeFieldType;
  dateValue?: "string" | "timestamp";
  shortcuts?: readonly { label: string; value: () => unknown }[];
}

/**
 * File input. Without `upload`, the stored value is the `File` list.
 * `upload` runs on change. Rejecting it shows the error under the control and does not store a value.
 * `reset()` aborts the `AbortSignal` and drops a late result.
 */
export interface UploadField<
  T extends object,
  K extends FieldName<T> = FieldName<T>,
> extends FieldShared<T, K> {
  type: "upload";
  /** Passed to `<input accept>`. Example: `"image/*"`. */
  accept?: string;
  multiple?: boolean;
  /** Return the value to store. Throw or reject to keep the previous value and show the message. */
  upload?: (files: File[], signal: AbortSignal) => Promise<unknown>;
}

/**
 * Your control, via `render` or `component`.
 * Neither is required by the type so a host can attach one later; dev mode warns when both are missing.
 */
export interface CustomField<
  T extends object,
  K extends FieldName<T> = FieldName<T>,
> extends FieldShared<T, K> {
  type: "custom";
}

/**
 * Printed when `daterange` is attached to a scalar model field.
 * Assigning a string or number fails against `fix`. Do not construct this type.
 */
interface DateRangeMismatch<
  T extends object,
  K extends FieldName<T>,
> extends Omit<DateRangeField<T, K>, "defaultValue"> {
  defaultValue: {
    readonly code: "RAC-FIELD-RANGE";
    readonly fix: "Type this field as a two-item tuple [start, end]. daterange rejects a scalar string or number.";
  };
}

/**
 * Printed when `match: "between"` is attached to a scalar model field.
 * One member, so the error is this fix and not every other widget. Do not construct it.
 */
type BetweenError<T extends object, K extends FieldName<T>> = Omit<
  FieldShared<T, K>,
  "match"
> & {
  match: "between";
  readonly "RAC-FIELD-BETWEEN": {
    readonly code: "RAC-FIELD-BETWEEN";
    readonly fix: "Type this field as a two-item tuple [from, to]. match between rejects a scalar.";
  };
};

type DateRangeFor<T extends object, K extends FieldName<T>> =
  RangeOk<T[K]> extends true ? DateRangeField<T, K> : DateRangeMismatch<T, K>;

type FieldVariant<T extends object, K extends FieldName<T>> =
  | InputField<T, K>
  | TextareaField<T, K>
  | NumberField<T, K>
  | SwitchField<T, K>
  | ChoiceField<T, K>
  | DateField<T, K>
  | DateRangeFor<T, K>
  | UploadField<T, K>
  | CustomField<T, K>;

type WithMatch<T extends object, K extends FieldName<T>> =
  RangeOk<T[K]> extends true
    ? FieldVariant<T, K>
    : | (FieldVariant<T, K> & {
          match?: Exclude<MatchOperator, "between">;
          search?: SearchConfig & {
            match?: Exclude<MatchOperator, "between">;
          };
        })
      | BetweenError<T, K>;

/**
 * Pure display, decorator, and layout items (no data binding).
 */
export interface DisplayItemBase extends Access, TipConfig {
  name?: undefined;
  span?: number;
  lineBreak?: boolean;
  hidden?: Dynamic<boolean, any>;
  disabled?: Dynamic<boolean, any>;
  style?: CSSProperties;
  className?: string;
  classNames?: FieldClassNames;
  styles?: FieldStyles;
}

export interface TitleItem extends DisplayItemBase {
  type: "title";
  label: string;
}

export interface TipItem extends DisplayItemBase {
  type: "tip";
  /** Body content of the tip item. */
  content?: ReactNode;
  /** @deprecated Use `content` instead */
  tip?: ReactNode;
  label?: string;
}

export interface ButtonItem<
  T extends object = Record<string, unknown>,
> extends DisplayItemBase {
  type: "button";
  label: string;
  disabled?: Dynamic<boolean, T>;
  onAction?: (values: Readonly<T>) => void;
}

export interface AppendItem extends DisplayItemBase {
  type: "append";
  content?: ReactNode;
  /** @deprecated Use `content` instead */
  tip?: ReactNode;
}

export interface DividerItem extends DisplayItemBase {
  type: "divider";
}

/**
 * Non-data display item union.
 */
export type DisplayItem<T extends object = Record<string, unknown>> =
  TitleItem | TipItem | ButtonItem<T> | AppendItem | DividerItem;

/**
 * Data-bearing form field for model `T`.
 */
export type FormField<T extends object> = {
  [K in FieldName<T>]: WithMatch<T, K>;
}[FieldName<T>];

/**
 * Single item in a form: either a data-bearing field or a display item.
 */
export type FormItem<T extends object> = FormField<T> | DisplayItem<T>;

/**
 * One schema field or display item.
 *
 * Discriminant is `type` (and `name`, and `match: "between"`).
 * `type: "select"` without `options` errors on {@link ChoiceField} only.
 * A scalar model field used as `"daterange"` or `match: "between"` errors with
 * `RAC-FIELD-RANGE` or `RAC-FIELD-BETWEEN` and a one-line fix, not every widget.
 * `name` still completes `defaultValue` as `T[name]`.
 *
 * {@link AnyField} plus `unsafeField` skip these checks. Dev warnings still run.
 */
export type Field<T extends object> = FormItem<T>;

/**
 * Backwards-compatibility alias for display items.
 * `"title"` renders `label` as a heading.
 * `"tip"` and `"append"` render `content` / `tip`. `"button"` renders `label` and calls `onAction` on click.
 */
export type DisplayField<T extends object> = DisplayItem<T> & {
  lang?: string;
  required?: boolean;
  rules?: FieldShared<T>["rules"];
  onChange?: (value: unknown, values: T) => Partial<T> | void;
  more?: boolean;
};

/**
 * Type guard checking if an item is a display item without value binding.
 */
export function isDisplayItem<T extends object>(
  item: Field<T> | AnyField<T> | DisplayItem<T>,
): item is DisplayItem<T> {
  const i = item as { name?: unknown; type?: unknown };
  return (
    !("name" in i) ||
    !i.name ||
    i.type === "title" ||
    i.type === "tip" ||
    i.type === "button" ||
    i.type === "append" ||
    i.type === "divider"
  );
}

/**
 * Unchecked field. Every prop is optional, so `type: "select"` without `options` compiles.
 * This is the escape hatch. Pass it through {@link unsafeField} when a component asks for {@link Field}.
 * Dev mode still warns about missing options, scalar ranges, and `match: "between"`.
 */
export interface AnyField<T extends object> extends Access, TipConfig {
  name?: FieldName<T>;
  label?: string;
  lang?: string;
  type?: FieldType;
  defaultValue?: unknown;
  hidden?: Dynamic<boolean, T>;
  disabled?: Dynamic<boolean, T>;
  required?: boolean;
  placeholder?: string;
  options?: Dynamic<readonly Option[], T>;
  multiple?: boolean;
  virtual?: boolean;
  span?: number;
  lineBreak?: boolean;
  style?: CSSProperties;
  className?: string;
  classNames?: FieldClassNames;
  styles?: FieldStyles;
  tip?: ReactNode;
  content?: ReactNode;
  rules?: readonly ((value: unknown, values: Readonly<T>) => unknown)[];
  render?: (context: FieldContext<T>) => ReactNode;
  component?: string;
  onChange?: (value: unknown, values: T) => Partial<T> | void;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  accept?: string;
  upload?: (files: File[], signal: AbortSignal) => Promise<unknown>;
  dateValue?: "string" | "timestamp";
  shortcuts?: readonly { label: string; value: () => unknown }[];
  onAction?: (values: Readonly<T>) => void;
  search?: SearchConfig;
  more?: boolean;
  match?: MatchOperator;
  ignoreCase?: boolean;
  includeNull?: boolean;
  searchFields?: readonly string[];
}

/**
 * `localStorage` adapter used when `config.storage` is omitted.
 * `get` returns `undefined` for missing and corrupt JSON. `set` / `remove` swallow quota errors.
 */
export interface StorageAdapter {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  remove(key: string): void;
}

/**
 * Optional remote store for table settings. Keys already include the namespace, for example `my-app:table:orders`.
 * `load` resolving `undefined` keeps the local copy. A rejection shows "Could not save settings" and a retry button.
 */
export interface SettingsAdapter {
  load(key: string): Promise<unknown>;
  save(key: string, value: unknown): Promise<void>;
}
