import type { TipConfig } from "../../core/tip";
import type { CSSProperties, ReactNode, Ref } from "react";
import type { Field, FieldName, AutoFormLayout } from "../../core/types";

/**
 * Imperative form API.
 * `validate` resolves `false` when a visible field fails or an upload is still running. It does not throw.
 * `reset` restores `defaultValue` (or the object you pass) and clears errors.
 * `setValue` runs that field's `onChange` patch. `focus` focuses the control for `name`.
 */
export interface AutoFormHandle<T extends object> {
  validate(): Promise<boolean>;
  reset(values?: T): void;
  getValues(): T;
  setValue<K extends FieldName<T>>(name: K, value: T[K]): void;
  focus(name: FieldName<T>): void;
}

/**
 * Schema form. Pass `value` to control it; otherwise the form keeps state and reports it through `onChange`.
 * `onSubmit` runs only after validation. A rejection keeps the values, shows `error.message`, and does not reset.
 * Field `rules` and `onChange` have their own failure behavior. See docs/auto-form.md.
 *
 * `columns` defaults to `2`. `actions` defaults to `true` (submit + reset).
 * Label layout defaults come from `AutoConfigProvider` (`labelPosition` `"top"`, `labelWidth` `"auto"`).
 */
export interface AutoFormProps<T extends object>
  extends AutoFormLayout, TipConfig {
  /** Checked schema. Use `unsafeField` only to bypass a discriminant on purpose. */
  fields: readonly Field<T>[];
  /** Controlled value. The form copies it in when it differs from internal state. */
  value?: T;
  /** Used for the uncontrolled initial value and for reset. Field `defaultValue` fills gaps. */
  defaultValue?: Partial<T>;
  /** Fires after every accepted edit. Omit it to keep state inside the form. */
  onChange?: (value: T) => void;
  /**
   * Called with the full value after validation passes.
   * Resolve to finish. Reject to keep the draft and show the error under the actions.
   */
  onSubmit?: (value: T) => void | Promise<void>;
  /** Called after a successful reset, including the reset button. */
  onReset?: () => void;
  /** Blocks edits and submit. Default `false`. */
  disabled?: boolean;
  /** Renders values without inputs. Default `false`. */
  readOnly?: boolean;
  /** Grid column count. Default `2`. */
  columns?: number;
  /** Render the built-in submit and reset buttons. Default `true`. Set `false` when the parent supplies buttons. */
  actions?: boolean;
  /** Defaults to the built-in "Submit", translated with `config.t`. */
  submitLabel?: string;
  resetLabel?: string;
  extraActions?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<AutoFormHandle<T>>;
}
