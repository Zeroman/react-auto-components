import type { CSSProperties, ReactNode, Ref } from "react";
import type { Field, FieldName, AutoFormLayout } from "../../core/types";
export interface AutoFormHandle<T extends object> {
  validate(): Promise<boolean>;
  reset(values?: T): void;
  getValues(): T;
  setValue<K extends FieldName<T>>(name: K, value: T[K]): void;
  focus(name: FieldName<T>): void;
}
export interface AutoFormProps<T extends object> extends AutoFormLayout {
  fields: readonly Field<T>[];
  value?: T;
  defaultValue?: Partial<T>;
  onChange?: (value: T) => void;
  onSubmit?: (value: T) => void | Promise<void>;
  onReset?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  columns?: number;
  actions?: boolean;
  submitLabel?: string;
  resetLabel?: string;
  extraActions?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<AutoFormHandle<T>>;
}
