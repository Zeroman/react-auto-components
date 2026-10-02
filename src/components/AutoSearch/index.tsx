import { useAutoText } from "../../core/i18n";
import { useState, useRef } from "react";
import { AutoForm, type AutoFormHandle } from "../AutoForm";
import { defaults, resolve } from "../../core/config";
import { buildQuery, type QueryNode } from "../../core/query";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import { useLibraryStyles } from "../../core/dev";
import type { Field, AutoFormLayout } from "../../core/types";
/**
 * Search form that emits a {@link QueryNode} plus the raw values.
 * `mode` defaults to `"manual"` (search on submit). `"instant"` also searches on every change.
 * `columns` defaults to `3`.
 * A thrown `onSearch` is caught by the inner form: values stay, and the error string is shown. Reset is not implied.
 * Empty values are omitted. `match: "isNull"` is the exception and matches null.
 * `match: "between"` requires a two-item value. See docs/auto-search.md.
 */
export interface AutoSearchProps<T extends object> extends AutoFormLayout {
  fields: readonly Field<T>[];
  value?: T;
  defaultValue?: Partial<T>;
  /** Fires when the draft changes, including reset. */
  onChange?: (values: T) => void;
  /**
   * Required. Receives the built query and the values.
   * Reject or throw to keep the draft and show `error.message`.
   */
  onSearch: (query: QueryNode, values: T) => void;
  /** Default `"manual"`. `"instant"` searches on each change as well as on submit. */
  mode?: "manual" | "instant";
  /** Default `3`. */
  columns?: number;
  disabled?: boolean;
  searchLabel?: string;
  resetLabel?: string;
  extraActions?: React.ReactNode;
  sortTags?: readonly {
    id: string;
    label: string;
    onRemove: () => void;
  }[];
}
export function AutoSearch<T extends object>({
  fields,
  value,
  defaultValue,
  onChange,
  onSearch,
  mode = "manual",
  columns = 3,
  labelPosition,
  labelAlign,
  labelWidth,
  density: ownDensity,
  size: ownSize,
  disabled,
  searchLabel,
  resetLabel,
  extraActions,
  sortTags,
}: AutoSearchProps<T>) {
  const tr = useAutoText();
  const services = useAutoConfig();
  useLibraryStyles();
  const density =
    ownDensity ?? services.form.density ?? services.density ?? "comfortable";
  const size = ownSize ?? services.form.size ?? services.size ?? "medium";
  const effectiveLabelWidth = labelWidth ?? services.form.labelWidth ?? "auto";
  const isAutoLabelWidth = effectiveLabelWidth === "auto";
  const [local, setLocal] = useState(() => defaults<T>(fields, defaultValue)),
    [more, setMore] = useState(false);
  const current = value ?? local;
  const ref = useRef<AutoFormHandle<T>>(null);
  const send = (v: T) =>
    onSearch(
      buildQuery(
        v,
        fields.filter((f) => !resolve(f.hidden, v, false)),
      ),
      v,
    );
  const change = (v: T) => {
    setLocal(v);
    onChange?.(v);
    if (mode === "instant") send(v);
  };
  return (
    <section
      className="auto-root auto-search"
      data-testid="rac-search-panel"
      data-density={density}
      data-size={size}
      data-label-width={
        isAutoLabelWidth
          ? "auto"
          : typeof effectiveLabelWidth === "number"
            ? `${effectiveLabelWidth}px`
            : effectiveLabelWidth
      }
    >
      <AutoForm
        ref={ref}
        fields={
          fields.map((f) => ({
            ...f,
            hidden: (v: Readonly<T>) =>
              resolve(f.hidden, v, false) || (!!f.more && !more),
          })) as Field<T>[]
        }
        value={current}
        onChange={change}
        onSubmit={send}
        columns={columns}
        labelPosition={labelPosition}
        labelAlign={labelAlign}
        labelWidth={effectiveLabelWidth}
        density={density}
        size={size}
        disabled={disabled}
        actions={false}
      >
        <div className="auto-actions auto-form-actions">
          <button
            type="submit"
            className="auto-primary"
            data-testid="rac-search"
            disabled={disabled}
          >
            {searchLabel ?? tr("Search")}
          </button>
          <button
            type="button"
            data-testid="rac-search-reset"
            disabled={disabled}
            onClick={() => {
              const v = defaults<T>(fields, defaultValue);
              setLocal(v);
              onChange?.(v);
              send(v);
            }}
          >
            {resetLabel ?? tr("Reset")}
          </button>
          {extraActions}
          {fields.some((f) => f.more) && (
            <button
              type="button"
              data-testid="rac-more-filters"
              aria-expanded={more}
              onClick={() => setMore(!more)}
            >
              {more ? tr("Hide filters") : tr("More filters")}
            </button>
          )}
          {sortTags?.map((t) => (
            <button key={t.id} type="button" onClick={t.onRemove}>
              {t.label} ×
            </button>
          ))}
        </div>
      </AutoForm>
    </section>
  );
}

/** @deprecated Use {@link AutoSearchProps}. */
export type AutoSearchPanelProps<T extends object> = AutoSearchProps<T>;

/** @deprecated Use {@link AutoSearch}. */
export const AutoSearchPanel: typeof AutoSearch = AutoSearch;
