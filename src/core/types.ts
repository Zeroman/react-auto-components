import type { CSSProperties, ReactNode } from "react";
export type Values = Record<string, unknown>;
export type ComponentSize = "small" | "medium" | "large";
export type ComponentDensity = "comfortable" | "compact";
export type TableDensity = "compact" | "normal" | "comfortable";
export interface AutoFormLayout {
  labelPosition?: "top" | "left";
  labelAlign?: "left" | "right";
  labelWidth?: CSSProperties["width"];
  density?: ComponentDensity;
  size?: ComponentSize;
}
export type FieldName<T> = Extract<keyof T, string>;
export type Dynamic<V, T> = V | ((values: Readonly<T>) => V);
export interface Access {
  roles?: readonly string[];
  permissions?: readonly string[];
}
export interface Option {
  value: string | number | boolean;
  label: string;
  disabled?: boolean;
  children?: readonly Option[];
}
export type FieldType =
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
  | "title"
  | "tip"
  | "button"
  | "append"
  | "custom";
export interface FieldContext<T extends object> {
  id: string;
  value: unknown;
  values: Readonly<T>;
  onChange: (value: unknown) => void;
  disabled: boolean;
  error?: string;
}
export interface FieldBase<T extends object> extends Access {
  label?: string;
  lang?: string;
  type?: FieldType;
  hidden?: Dynamic<boolean, T>;
  disabled?: Dynamic<boolean, T>;
  required?: boolean;
  placeholder?: string;
  options?: Dynamic<readonly Option[], T>;
  multiple?: boolean;
  span?: number;
  lineBreak?: boolean;
  style?: CSSProperties;
  className?: string;
  tip?: ReactNode;
  rules?: readonly ((
    value: unknown,
    values: Readonly<T>,
  ) => string | undefined | Promise<string | undefined>)[];
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
  more?: boolean;
  match?: "eq" | "in" | "contains" | "between" | "isNull";
  ignoreCase?: boolean;
  includeNull?: boolean;
  searchFields?: readonly string[];
}
export type Field<T extends object> =
  | {
      [K in FieldName<T>]: FieldBase<T> & { name: K; defaultValue?: T[K] };
    }[FieldName<T>]
  | (FieldBase<T> & {
      name?: never;
      type: "title" | "tip" | "append" | "button";
      defaultValue?: never;
    });
export type AnyField<T extends object> = FieldBase<T> & {
  name?: FieldName<T>;
  defaultValue?: unknown;
};
export interface StorageAdapter {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  remove(key: string): void;
}
export interface SettingsAdapter {
  load(key: string): Promise<unknown>;
  save(key: string, value: unknown): Promise<void>;
}
